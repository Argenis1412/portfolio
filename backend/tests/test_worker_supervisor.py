"""Restart behavior is bounded, observable, and interruptible."""

import asyncio
from unittest.mock import AsyncMock, Mock

import pytest

import app.worker as module
from app.worker import StreamWorker


def test_worker_metrics_expose_availability_and_restarts():
    from prometheus_client import REGISTRY
    from app.worker_metrics import inc_worker_restart, set_worker_up

    before = REGISTRY.get_sample_value("contact_worker_restarts_total")
    inc_worker_restart()
    assert REGISTRY.get_sample_value("contact_worker_restarts_total") == before + 1
    set_worker_up(True)
    assert REGISTRY.get_sample_value("contact_worker_up") == 1
    set_worker_up(False)
    assert REGISTRY.get_sample_value("contact_worker_up") == 0


@pytest.mark.asyncio
async def test_supervisor_restarts_with_capped_backoff_and_closes_each_client(
    monkeypatch,
):
    worker = StreamWorker("redis://localhost")
    clients = []

    async def consume():
        client = AsyncMock()
        clients.append(client)
        worker._redis = client
        if len(clients) < 9:
            raise ConnectionError("offline")
        worker.stop()

    sleep = AsyncMock()
    restart = Mock()
    monkeypatch.setattr(worker, "_consume", consume)
    monkeypatch.setattr(worker, "_sleep_or_stop", sleep, raising=False)
    monkeypatch.setattr(module.random, "uniform", lambda *_: 1)
    monkeypatch.setattr(module, "inc_worker_restart", restart, raising=False)
    await worker.run()
    assert [call.args[0] for call in sleep.await_args_list] == [
        1,
        2,
        4,
        8,
        16,
        32,
        60,
        60,
    ]
    assert restart.call_count == 8
    for client in clients:
        client.aclose.assert_awaited_once()
    assert worker._redis is None


@pytest.mark.asyncio
async def test_supervisor_propagates_cancellation_and_sets_down(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    up = Mock()
    monkeypatch.setattr(
        worker, "_consume", AsyncMock(side_effect=asyncio.CancelledError)
    )
    monkeypatch.setattr(module, "set_worker_up", up, raising=False)
    with pytest.raises(asyncio.CancelledError):
        await worker.run()
    client.aclose.assert_awaited_once()
    up.assert_called_with(False)


@pytest.mark.asyncio
async def test_stop_interrupts_backoff_immediately(monkeypatch):
    worker = StreamWorker("redis://localhost")
    entered = asyncio.Event()

    async def consume():
        entered.set()
        raise ConnectionError("offline")

    monkeypatch.setattr(worker, "_consume", consume)
    monkeypatch.setattr(module, "_RESTART_BACKOFF_MIN", 60, raising=False)
    task = asyncio.create_task(worker.run())
    try:
        await asyncio.wait_for(entered.wait(), 1)
        await asyncio.sleep(0)
        assert not task.done()
        worker.stop()
        await asyncio.wait_for(task, 0.5)
    finally:
        worker.stop()
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


@pytest.mark.asyncio
async def test_quota_cooldown_waits_then_retries(monkeypatch):
    worker = StreamWorker("redis://localhost")
    attempts = 0

    async def consume():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            worker.redis_disabled_until = module.time.time() + 3600
        else:
            worker.stop()

    async def sleep(seconds):
        assert seconds == module._QUOTA_COOLDOWN_SLEEP
        worker.redis_disabled_until = None

    monkeypatch.setattr(worker, "_consume", consume)
    waiting = AsyncMock(side_effect=sleep)
    monkeypatch.setattr(worker, "_sleep_or_stop", waiting, raising=False)
    await worker.run()
    assert attempts == 2
    waiting.assert_awaited_once()


@pytest.mark.asyncio
async def test_stable_consumption_resets_backoff(monkeypatch):
    worker = StreamWorker("redis://localhost")
    consume = AsyncMock(side_effect=[ConnectionError(), ConnectionError(), None])
    clock = iter([0, 0, 1, 122, 123])

    async def sleep(seconds):
        if consume.await_count == 2:
            worker.stop()

    monkeypatch.setattr(worker, "_consume", consume)
    waiting = AsyncMock(side_effect=sleep)
    monkeypatch.setattr(worker, "_sleep_or_stop", waiting, raising=False)
    # Patch the module clock, not asyncio's shared time module.
    monkeypatch.setattr(module, "time", Mock(monotonic=lambda: next(clock)))
    monkeypatch.setattr(module.random, "uniform", lambda *_: 1)
    await worker.run()
    assert [call.args[0] for call in waiting.await_args_list] == [1, 1]
