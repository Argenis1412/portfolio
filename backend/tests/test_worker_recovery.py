"""Reclaimed entries must be processed, not just reassigned to a new consumer."""

import json
from unittest.mock import AsyncMock, Mock

import pytest

import app.worker as module
from app.worker import StreamWorker


def message():
    return {
        "job_name": "send_contact_email",
        "payload": json.dumps(
            {
                "job_name": "send_contact_email",
                "payload": {
                    "name": "Test",
                    "email": "test@example.com",
                    "message": "Hi",
                },
                "meta": {},
            }
        ),
    }


@pytest.mark.asyncio
async def test_reclaim_follows_all_cursor_pages_and_processes_entries(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    client.xautoclaim.side_effect = [
        ["10-0", [("1-0", message())], []],
        ["20-0", [], []],
        ["0-0", [("21-0", message())], []],
    ]
    client.xpending_range.return_value = [{"times_delivered": 2}]
    use_case = Mock(execute=AsyncMock(return_value=True))
    reclaimed = Mock()
    monkeypatch.setattr(module, "get_send_contact_use_case", lambda: use_case)
    monkeypatch.setattr(module, "inc_reclaimed", reclaimed)
    assert await worker._reclaim_pending() == 2
    assert use_case.execute.await_count == 2
    assert [call.args[2] for call in client.xack.await_args_list] == ["1-0", "21-0"]
    assert [call.kwargs["start_id"] for call in client.xautoclaim.await_args_list] == [
        "0-0",
        "10-0",
        "20-0",
    ]
    for call in client.xautoclaim.await_args_list:
        assert call.kwargs["min_idle_time"] == 60_000
        assert call.kwargs["count"] == 10
    reclaimed.assert_called_once_with(2)


@pytest.mark.asyncio
@pytest.mark.parametrize("data", [None, {}])
async def test_reclaim_acknowledges_deleted_entries_without_processing(
    monkeypatch, data
):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    client.xautoclaim.return_value = ["0", [("1-0", data)]]
    handle = AsyncMock()
    monkeypatch.setattr(worker, "_handle_message", handle, raising=False)
    assert await worker._reclaim_pending() == 0
    client.xack.assert_awaited_once_with("contact_jobs", "email_workers", "1-0")
    handle.assert_not_awaited()
    client.xpending_range.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("raw", [None, "{invalid json", "null"])
async def test_reclaim_moves_poison_to_dlq_before_ack(monkeypatch, raw):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    data = message()
    if raw is not None:
        data["payload"] = raw
    client.xautoclaim.return_value = ["0-0", [("1-0", data)], []]
    client.xpending_range.return_value = [{"times_delivered": 6}]
    calls = []

    async def dlq(job_id, body, reason, error_type):
        calls.append("dlq")
        assert reason == "max_deliveries_exceeded"
        assert error_type == "RuntimeError"
        if raw is not None:
            assert body["payload"] == {"raw_payload": raw}

    async def ack(*_):
        calls.append("ack")

    monkeypatch.setattr(worker, "_move_to_dlq", dlq)
    handle = AsyncMock()
    monkeypatch.setattr(worker, "_handle_message", handle, raising=False)
    client.xack.side_effect = ack
    assert await worker._reclaim_pending() == 0
    assert calls == ["dlq", "ack"]
    handle.assert_not_awaited()


@pytest.mark.asyncio
async def test_reclaim_dlq_failure_preserves_pending_entry(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    client.xautoclaim.return_value = ["0", [("1-0", message())], []]
    client.xpending_range.return_value = [{"times_delivered": 6}]
    monkeypatch.setattr(worker, "_move_to_dlq", AsyncMock(side_effect=ConnectionError))
    with pytest.raises(ConnectionError):
        await worker._reclaim_pending()
    client.xack.assert_not_awaited()


@pytest.mark.asyncio
async def test_fifth_delivery_is_processed_not_discarded(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    data = message()
    client.xautoclaim.return_value = ["0", [("1-0", data)], []]
    client.xpending_range.return_value = [{"times_delivered": 5}]
    handle = AsyncMock()
    monkeypatch.setattr(worker, "_handle_message", handle)
    assert await worker._reclaim_pending() == 1
    handle.assert_awaited_once_with("1-0", data)


@pytest.mark.asyncio
async def test_recovery_waits_sixty_seconds_then_uses_five_minute_interval(monkeypatch):
    worker = StreamWorker("redis://localhost")
    client = AsyncMock()
    worker._redis = client
    client.xpending.return_value = {"pending": 0}
    delays = []

    async def sleep(seconds):
        delays.append(seconds)
        if len(delays) == 2:
            worker.stop()

    monkeypatch.setattr(worker, "_sleep_or_stop", sleep)
    reclaim = AsyncMock(return_value=0)
    monkeypatch.setattr(worker, "_reclaim_pending", reclaim)
    # Verify ordering without sleeping for six minutes.
    await worker._recovery_loop()
    assert delays == [60, 300]
    reclaim.assert_awaited_once()
