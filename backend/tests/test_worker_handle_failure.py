"""Tests for StreamWorker._handle_failure first_seen_at handling."""

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

import pytest

from app.worker import StreamWorker


@pytest.fixture
def worker():
    w = StreamWorker(redis_url="redis://localhost:6379")
    w._redis = AsyncMock()
    w._redis.xack = AsyncMock()
    w._redis.xadd = AsyncMock()
    return w


def _build_body(first_seen_at=None, retry_count=0):
    meta = {"retry_count": retry_count}
    if first_seen_at is not None:
        meta["first_seen_at"] = first_seen_at
    return {
        "job_name": "send_contact_email",
        "payload": {"email": "test@example.com", "name": "Test", "message": "Hi"},
        "meta": meta,
    }


class TestFirstSeenAtHandling:
    @pytest.mark.asyncio
    async def test_corrupt_first_seen_at_routes_to_dlq(self, worker):
        body = _build_body(first_seen_at="not-a-date", retry_count=0)
        exc = RuntimeError("provider_unknown_failure")

        with patch.object(worker, "_move_to_dlq", new_callable=AsyncMock) as mock_dlq:
            await worker._handle_failure("job-1", body, exc)

        mock_dlq.assert_called_once_with(
            "job-1", body, "invalid_first_seen_at", "ValueError"
        )
        worker._redis.xack.assert_called()

    @pytest.mark.asyncio
    async def test_naive_datetime_treated_as_utc(self, worker):
        naive_recent = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
        body = _build_body(first_seen_at=naive_recent, retry_count=0)
        exc = RuntimeError("provider_unknown_failure")

        with patch.object(worker, "_move_to_dlq", new_callable=AsyncMock) as mock_dlq:
            await worker._handle_failure("job-2", body, exc)

        mock_dlq.assert_not_called()
        worker._redis.xadd.assert_called()

    @pytest.mark.asyncio
    async def test_expired_job_routes_to_dlq(self, worker):
        old_ts = (datetime.now(timezone.utc) - timedelta(seconds=1000)).isoformat()
        body = _build_body(first_seen_at=old_ts, retry_count=0)
        exc = RuntimeError("provider_unknown_failure")

        with patch.object(worker, "_move_to_dlq", new_callable=AsyncMock) as mock_dlq:
            await worker._handle_failure("job-3", body, exc)

        mock_dlq.assert_called_once_with(
            "job-3", body, "max_age_exceeded", "TimeoutError"
        )

    @pytest.mark.asyncio
    async def test_no_first_seen_at_requeues_normally(self, worker):
        body = _build_body(first_seen_at=None, retry_count=0)
        exc = RuntimeError("provider_unknown_failure")

        with patch.object(worker, "_move_to_dlq", new_callable=AsyncMock) as mock_dlq:
            await worker._handle_failure("job-4", body, exc)

        mock_dlq.assert_not_called()
        worker._redis.xadd.assert_called()
