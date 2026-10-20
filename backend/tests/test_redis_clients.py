"""Redis consumers share configuration while retaining their timeout profiles."""

from unittest.mock import AsyncMock, Mock

import pytest

from app.core import infrastructure
from app.core.idempotency import IdempotencyStore
from app.core.spam_store import SpamDedupStore
from app.settings import settings
from app.worker import StreamWorker


@pytest.fixture
def redis_factory(monkeypatch):
    monkeypatch.setattr(settings, "redis_url", "redis://test")
    monkeypatch.setattr(settings, "redis_socket_timeout_seconds", 3.5)
    monkeypatch.setattr(settings, "redis_connect_timeout_seconds", 1.5)
    monkeypatch.setattr(infrastructure, "_redis_client", None)
    factory = Mock(return_value=AsyncMock())
    monkeypatch.setattr(infrastructure.redis, "from_url", factory)
    return factory


def test_queue_client_honors_configured_timeouts_and_is_shared(redis_factory):
    first = infrastructure.get_redis()
    assert infrastructure.get_redis() is first
    redis_factory.assert_called_once_with(
        "redis://test",
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=3.5,
        socket_connect_timeout=1.5,
        health_check_interval=0,
        retry_on_timeout=True,
    )


@pytest.mark.parametrize("store_type", [IdempotencyStore, SpamDedupStore])
def test_contact_stores_keep_health_checks_and_configured_timeouts(
    redis_factory, store_type
):
    if store_type is IdempotencyStore:
        store_type()
    else:
        store_type("redis://test")
    redis_factory.assert_called_once_with(
        "redis://test",
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=3.5,
        socket_connect_timeout=1.5,
        health_check_interval=30,
        retry_on_timeout=False,
    )


async def test_blocking_worker_retains_longer_timeouts_and_own_client(redis_factory):
    worker = StreamWorker("redis://test")
    first = await worker._get_client()
    assert await worker._get_client() is first
    redis_factory.assert_called_once_with(
        "redis://test",
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=60,
        socket_connect_timeout=10,
        health_check_interval=0,
        retry_on_timeout=False,
    )
    assert infrastructure._redis_client is None


@pytest.mark.parametrize("close_fails", [False, True])
async def test_shared_client_is_closed_and_recreated_after_shutdown(
    redis_factory, close_fails
):
    first = AsyncMock()
    second = AsyncMock()
    redis_factory.side_effect = [first, second]
    if close_fails:
        first.close.side_effect = ConnectionError("close failed")
    assert infrastructure.get_redis() is first

    await infrastructure.dispose_all()

    first.close.assert_awaited_once()
    assert infrastructure._redis_client is None
    assert infrastructure.get_redis() is second


def test_unconfigured_shared_client_fails_without_creating_connection(
    redis_factory, monkeypatch
):
    monkeypatch.setattr(settings, "redis_url", None)
    with pytest.raises(RuntimeError, match="Redis is not configured"):
        infrastructure.get_redis()
    redis_factory.assert_not_called()
