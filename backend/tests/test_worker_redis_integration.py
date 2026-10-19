"""Real Redis tests use only an explicitly configured disposable local database."""

import asyncio
import os
import socket
from contextlib import suppress
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlsplit

import pytest
import pytest_asyncio

import app.core.infrastructure as infrastructure
import app.worker as module
from app.core.queue import RedisStreamsQueue
from app.worker import StreamWorker


def safe_redis_url(url):
    parsed = urlsplit(url)
    if (
        parsed.scheme != "redis"
        or parsed.hostname not in {"localhost", "127.0.0.1", "redis"}
        or parsed.path != "/15"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError(
            "REDIS_TEST_URL must target disposable local Redis database /15"
        )
    return parsed


@pytest.mark.parametrize(
    "url",
    [
        "redis://production.example/15",
        "redis://localhost/0",
        "redis://localhost",
        "rediss://redis/15",
        "redis://secret@localhost/15",
        "redis://localhost/15?db=0",
    ],
)
def test_integration_url_rejects_unsafe_database(url):
    with pytest.raises(ValueError, match="disposable local"):
        safe_redis_url(url)


@pytest_asyncio.fixture
async def real_redis(monkeypatch):
    url = os.getenv("REDIS_TEST_URL")
    if not url:
        pytest.skip("Set REDIS_TEST_URL to a disposable local database /15")
    safe_redis_url(url)  # Validate before creating a client or issuing any command.
    client = infrastructure.create_redis_client(url)
    previous = infrastructure._redis_client
    try:
        await client.ping()
        await client.flushdb()
        infrastructure._redis_client = client
        use_case = Mock(execute=AsyncMock(return_value=True))
        monkeypatch.setattr(module, "get_send_contact_use_case", lambda: use_case)
        yield url, client, use_case
    finally:
        infrastructure._redis_client = previous
        try:
            await client.flushdb()
        finally:
            await client.aclose()


async def eventually(predicate, timeout=5):
    async with asyncio.timeout(timeout):
        while not await predicate():
            await asyncio.sleep(0.01)


async def stop_worker(worker, task):
    worker.stop()
    task.cancel()  # Interrupt the blocking XREADGROUP, as lifespan does on timeout.
    with suppress(asyncio.CancelledError):
        await task


@pytest.mark.redis_integration
@pytest.mark.asyncio
async def test_worker_survives_closed_port_then_consumes_real_redis(
    real_redis, monkeypatch
):
    url, client, use_case = real_redis
    destination = safe_redis_url(url)
    # A local relay starts only after the first refused connection. Redis remains
    # real; the worker's URL never changes and no Docker control is needed in CI.
    reservation = socket.socket()
    reservation.bind(("127.0.0.1", 0))
    port = reservation.getsockname()[1]
    reservation.close()
    worker = StreamWorker(f"redis://127.0.0.1:{port}/15")
    failed = asyncio.Event()
    monkeypatch.setattr(module, "inc_worker_restart", failed.set, raising=False)
    monkeypatch.setattr(module, "_RESTART_BACKOFF_MIN", 0.05, raising=False)
    relays = set()

    async def relay(reader, writer):
        current = asyncio.current_task()
        relays.add(current)
        remote_writer = None
        try:
            remote_reader, remote_writer = await asyncio.open_connection(
                destination.hostname, destination.port or 6379
            )

            async def forward(source, target):
                while data := await source.read(65536):
                    target.write(data)
                    await target.drain()

            directions = [
                asyncio.create_task(forward(reader, remote_writer)),
                asyncio.create_task(forward(remote_reader, writer)),
            ]
            try:
                await asyncio.wait(directions, return_when=asyncio.FIRST_COMPLETED)
            finally:
                for direction in directions:
                    direction.cancel()
                await asyncio.gather(*directions, return_exceptions=True)
        finally:
            writer.close()
            if remote_writer:
                remote_writer.close()
            relays.discard(current)

    task = asyncio.create_task(worker.run())
    server = None
    try:
        await asyncio.wait_for(failed.wait(), 15)
        assert not task.done()
        server = await asyncio.start_server(relay, "127.0.0.1", port)
        job = await RedisStreamsQueue().enqueue(
            "send_contact_email",
            {"name": "Local Test", "email": "test@example.com", "message": "Test"},
        )
        assert job

        async def delivered():
            if use_case.execute.await_count != 1:
                return False
            return (await client.xpending(worker.stream_name, worker.group_name))[
                "pending"
            ] == 0

        await eventually(delivered)
        use_case.execute.assert_awaited_once()
    finally:
        await stop_worker(worker, task)
        if server:
            server.close()
            await server.wait_closed()
        active = list(relays)
        for relay_task in active:
            relay_task.cancel()
        await asyncio.gather(*active, return_exceptions=True)
