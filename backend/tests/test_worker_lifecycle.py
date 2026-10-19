"""The API owns one consumer and releases worker resources on shutdown."""

import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI

import app.main as main
from app.worker import StreamWorker


def test_consumer_names_are_unique_and_can_be_overridden():
    first = StreamWorker("redis://localhost")
    second = StreamWorker("redis://localhost")
    assert first.consumer_name != second.consumer_name
    assert (
        StreamWorker("redis://localhost", consumer_name="explicit").consumer_name
        == "explicit"
    )


@pytest.mark.asyncio
@pytest.mark.parametrize("setup_result", [False, True])
async def test_worker_closes_redis_on_setup_rejection_or_normal_stop(
    monkeypatch, setup_result
):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    worker.stop()
    monkeypatch.setattr(worker, "setup", AsyncMock(return_value=setup_result))

    await worker.run()

    client.aclose.assert_awaited_once()
    assert worker._redis is None


@pytest.mark.asyncio
async def test_worker_cancellation_stops_recovery_and_closes_redis(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    monkeypatch.setattr(worker, "setup", AsyncMock(return_value=True))
    reading = asyncio.Event()
    recovering = asyncio.Event()
    recovery_stopped = asyncio.Event()

    async def block_read(*args, **kwargs):
        reading.set()
        await asyncio.Event().wait()

    async def recover():
        try:
            recovering.set()
            await asyncio.Event().wait()
        finally:
            recovery_stopped.set()

    client.xreadgroup.side_effect = block_read
    monkeypatch.setattr(worker, "_recovery_loop", recover)
    task = asyncio.create_task(worker.run())
    await asyncio.wait_for(reading.wait(), timeout=1)
    await asyncio.wait_for(recovering.wait(), timeout=1)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await asyncio.wait_for(task, timeout=1)

    assert recovery_stopped.is_set()
    client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_worker_setup_exception_closes_redis(monkeypatch):
    worker = StreamWorker("redis://localhost")
    clients = [AsyncMock(), AsyncMock()]
    attempts = 0

    async def setup():
        nonlocal attempts
        worker._redis = clients[attempts]
        attempts += 1
        if attempts == 2:
            worker.stop()
        raise ConnectionError("offline")

    monkeypatch.setattr(worker, "setup", setup)
    monkeypatch.setattr(worker, "_sleep_or_stop", AsyncMock())
    await worker.run()
    assert attempts == 2
    for client in clients:
        client.aclose.assert_awaited_once()
    assert worker._redis is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("enabled", "redis_url"), [(False, "redis://localhost"), (True, None)]
)
async def test_lifespan_skips_disabled_or_unconfigured_worker(
    monkeypatch, enabled, redis_url
):
    monkeypatch.setattr(main.settings, "worker_enabled", enabled)
    monkeypatch.setattr(main.settings, "redis_url", redis_url)
    factory = Mock()
    dispose = AsyncMock()
    monkeypatch.setattr(main, "StreamWorker", factory)
    monkeypatch.setattr(main, "dispose_all", dispose)

    async with main._lifespan(FastAPI()):
        pass

    factory.assert_not_called()
    dispose.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("body_fails", [False, True])
async def test_lifespan_starts_once_and_cleans_up_even_on_body_error(
    monkeypatch, body_fails
):
    monkeypatch.setattr(main.settings, "worker_enabled", True)
    monkeypatch.setattr(main.settings, "redis_url", "redis://localhost")
    stopped = asyncio.Event()
    started = asyncio.Event()

    async def run():
        started.set()
        await stopped.wait()

    worker = Mock(run=AsyncMock(side_effect=run), stop=Mock(side_effect=stopped.set))
    factory = Mock(return_value=worker)
    dispose = AsyncMock()
    monkeypatch.setattr(main, "StreamWorker", factory)
    monkeypatch.setattr(main, "dispose_all", dispose)

    async def exercise():
        async with main._lifespan(FastAPI()):
            await asyncio.wait_for(started.wait(), timeout=1)
            if body_fails:
                raise RuntimeError("application error")

    if body_fails:
        with pytest.raises(RuntimeError, match="application error"):
            await exercise()
    else:
        await exercise()

    factory.assert_called_once_with("redis://localhost")
    worker.run.assert_awaited_once()
    worker.stop.assert_called_once()
    dispose.assert_awaited_once()


@pytest.mark.asyncio
async def test_lifespan_logs_unexpected_worker_exit_immediately(monkeypatch):
    monkeypatch.setattr(main.settings, "worker_enabled", True)
    monkeypatch.setattr(main.settings, "redis_url", "redis://localhost")
    error = RuntimeError("worker failed")
    worker = Mock(running=True, run=AsyncMock(side_effect=error))
    monkeypatch.setattr(main, "StreamWorker", Mock(return_value=worker))
    monkeypatch.setattr(main, "dispose_all", AsyncMock())
    logger = Mock()
    monkeypatch.setattr(main, "logger", logger)
    async with main._lifespan(FastAPI()):
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        logger.error.assert_called_once()
        args, kwargs = logger.error.call_args
        assert args == ("worker_task_exited_unexpectedly",)
        assert kwargs["exc_info"][1] is error
