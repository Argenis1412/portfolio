from unittest.mock import Mock

import pytest
from pydantic import ValidationError
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

from app.core import rate_limit as module
from app.settings import Settings


def request(path='/api/v1/contact'):
    return Request({'type': 'http', 'path': path, 'headers': [], 'client': ('127.0.0.1', 1), 'scheme': 'http', 'server': ('localhost', 80)})


@pytest.mark.parametrize('value', [0, -1, float('inf'), float('-inf'), float('nan')])
def test_invalid_timeout(value):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, RATE_LIMIT_REDIS_TIMEOUT_SECONDS=value)


def test_timeout_setting():
    assert Settings(_env_file=None).rate_limit_redis_timeout_seconds == 1.0
    assert Settings(_env_file=None, RATE_LIMIT_REDIS_TIMEOUT_SECONDS=0.25).rate_limit_redis_timeout_seconds == 0.25


def test_breaker_cooldown_and_recovery(monkeypatch):
    clock = Mock(return_value=100.0)
    monkeypatch.setattr(module.time, 'monotonic', clock)
    hit = Mock(side_effect=ConnectionError('unavailable'))
    monkeypatch.setattr(module.limiter.limiter, 'hit', hit)
    fallback = Mock(return_value=True)
    monkeypatch.setattr(module._fallback_limiter.limiter, 'hit', fallback)
    for _ in range(4):
        module.check_rate_limit(request(), '10/day')
    assert hit.call_count == 1
    assert fallback.call_count == 4
    assert module._redis_disabled_until == 130
    clock.return_value = 129
    module.check_rate_limit(request(), '10/day')
    assert hit.call_count == 1
    clock.return_value = 130
    module.check_rate_limit(request(), '10/day')
    assert hit.call_count == 2
    assert module._redis_disabled_until == 160
    clock.return_value = 160
    hit.side_effect = None
    hit.return_value = True
    module.check_rate_limit(request(), '10/day')
    assert module._redis_disabled_until == 0


def test_quota_does_not_open_breaker(monkeypatch):
    monkeypatch.setattr(module.limiter.limiter, 'hit', Mock(return_value=False))
    with pytest.raises(RateLimitExceeded):
        module.check_rate_limit(request(), '10/day')
    assert module._redis_disabled_until == 0


def test_memory_quota_and_readonly(monkeypatch):
    monkeypatch.setattr(module.limiter.limiter, 'hit', Mock(side_effect=ConnectionError()))
    module.check_rate_limit(request(), '1/day')
    with pytest.raises(RateLimitExceeded):
        module.check_rate_limit(request(), '1/day')
    module.check_rate_limit(request('/api/v1/projects'), '1/day')


def test_unresponsive_tcp_backend_is_bounded(client, monkeypatch):
    import socket
    import threading
    import time
    from concurrent.futures import ThreadPoolExecutor
    from unittest.mock import AsyncMock
    from slowapi import Limiter
    from redis.backoff import NoBackoff
    from redis.retry import Retry
    from app.main import app
    from app.controllers.dependencies import get_send_contact_use_case, get_job_queue

    listener = socket.socket()
    listener.bind(('127.0.0.1', 0))
    listener.listen()
    listener.settimeout(0.1)
    stopped = threading.Event()
    accepted = threading.Event()
    connections = []

    def serve():
        while not stopped.is_set():
            try:
                connection, _ = listener.accept()
                connections.append(connection)
                accepted.set()
            except socket.timeout:
                continue

    server = threading.Thread(target=serve)
    server.start()
    backend = Limiter(key_func=module.get_client_ip, storage_uri=f'redis://127.0.0.1:{listener.getsockname()[1]}', storage_options={'socket_timeout': 1.0, 'socket_connect_timeout': 1.0, 'retry': Retry(NoBackoff(), 0), 'retry_on_timeout': False})
    monkeypatch.setattr(module, 'limiter', backend)
    app.dependency_overrides[get_send_contact_use_case] = lambda: AsyncMock()
    app.dependency_overrides[get_job_queue] = lambda: None
    payload = {'name': 'TCP Test', 'email': 'tcp@example.com', 'subject': 'Test', 'message': 'A valid message for the timeout regression test.'}
    try:
        with ThreadPoolExecutor() as pool:
            started = time.monotonic()
            contact = pool.submit(client.post, '/api/v1/contact', json=payload)
            assert accepted.wait(2)
            health = pool.submit(client.get, '/health')
            assert contact.result(timeout=3).status_code == 200
            assert health.result(timeout=3).status_code == 200
            assert time.monotonic() - started < 3
            count = len(connections)
            payload['message'] += ' A second request.'
            assert client.post('/api/v1/contact', json=payload).status_code == 200
            assert len(connections) == count
    finally:
        app.dependency_overrides.pop(get_send_contact_use_case, None)
        app.dependency_overrides.pop(get_job_queue, None)
        stopped.set()
        server.join(timeout=2)
        listener.close()
        for connection in connections:
            connection.close()
        backend._storage.storage.close()
