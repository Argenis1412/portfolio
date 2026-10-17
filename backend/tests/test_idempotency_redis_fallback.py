"""Tests for Redis idempotency lock contention and outage fallback."""

import time
from unittest.mock import AsyncMock, patch

import pytest

from app.core.idempotency import IdempotencyRecord, IdempotencyStore


@pytest.fixture
def store():
    with patch("app.core.idempotency.settings") as mock_settings:
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.redis_socket_timeout_seconds = 5
        mock_settings.redis_connect_timeout_seconds = 5
        with patch(
            "app.core.idempotency.create_redis_client", return_value=AsyncMock()
        ):
            s = IdempotencyStore()
        s._redis = AsyncMock()
        yield s


@pytest.mark.asyncio
@pytest.mark.parametrize("acquired", [True, False, None])
async def test_redis_lock_result_does_not_create_memory_lock(store, acquired):
    store._redis.set.return_value = acquired

    assert await store.set_in_progress("shared-key") is bool(acquired)
    assert store._cache == {}
    kwargs = store._redis.set.await_args.kwargs
    assert kwargs == {"ex": store.lock_ttl_seconds, "nx": True}


@pytest.mark.asyncio
@pytest.mark.parametrize("error_type", [ConnectionError, TimeoutError])
async def test_redis_exception_uses_memory_lock_and_rejects_duplicate(
    store, error_type
):
    store._redis.set.side_effect = error_type("Redis unavailable")

    assert await store.set_in_progress("fallback-key") is True
    assert await store.set_in_progress("fallback-key") is False
    assert store._cache["fallback-key"].in_progress is True


@pytest.mark.parametrize("redis_result", [False, None])
@pytest.mark.parametrize("record_state", ["missing", "in_progress", "finalized"])
def test_contact_redis_lock_race(client, store, redis_result, record_state):
    """Another request can reserve or finalize the key between GET and SET NX."""
    record = IdempotencyRecord(
        status_code=202,
        content={"success": True, "message": "Previously accepted"},
        timestamp=time.time(),
        in_progress=record_state == "in_progress",
    )
    store._redis.get.side_effect = [
        None,
        None if record_state == "missing" else record.model_dump_json(),
    ]
    store._redis.set.return_value = redis_result

    with patch("app.core.idempotency.store", store):
        response = client.post(
            "/api/v1/contact",
            headers={"Idempotency-Key": "shared-key"},
            json={
                "name": "Test User",
                "email": "test@example.com",
                "subject": "Concurrent request",
                "message": "This request must not acquire an occupied Redis key.",
            },
        )

    if record_state == "finalized":
        assert response.status_code == record.status_code
        assert response.json() == record.content
        assert response.headers["X-Cache-Idempotency"] == "HIT"
    else:
        assert response.status_code == 409
        assert response.json()["error"]["message"] == "Request already in progress"
    assert store._cache == {}
    assert store._redis.get.await_count == 2
    assert store._redis.set.await_count == 1


class TestRedisWarningDebounce:
    @pytest.mark.asyncio
    async def test_first_failure_emits_warning(self, store):
        store._redis.set = AsyncMock(side_effect=ConnectionError("connection refused"))

        with patch("app.core.idempotency.logger") as mock_logger:
            await store.set_in_progress("key-1")

        mock_logger.warning.assert_called_once_with(
            "idempotency_redis_fallback",
            op="set_in_progress",
            error="connection refused",
            error_type="ConnectionError",
        )

    @pytest.mark.asyncio
    async def test_second_failure_within_interval_suppressed(self, store):
        store._redis.set = AsyncMock(side_effect=ConnectionError("connection refused"))

        with patch("app.core.idempotency.logger") as mock_logger:
            await store.set_in_progress("key-1")
            await store.set_in_progress("key-2")

        assert mock_logger.warning.call_count == 1

    @pytest.mark.asyncio
    async def test_failure_after_interval_emits_again(self, store):
        store._redis.set = AsyncMock(side_effect=ConnectionError("connection refused"))

        with patch("app.core.idempotency.logger") as mock_logger:
            await store.set_in_progress("key-1")
            store._last_redis_warning = float("-inf")
            await store.set_in_progress("key-2")

        assert mock_logger.warning.call_count == 2

    @pytest.mark.asyncio
    async def test_set_emits_warning_on_redis_failure(self, store):
        store._redis.set = AsyncMock(side_effect=TimeoutError("timeout"))

        with patch("app.core.idempotency.logger") as mock_logger:
            await store.set("key-1", 200, {"ok": True})

        mock_logger.warning.assert_called_once_with(
            "idempotency_redis_fallback",
            op="set",
            error="timeout",
            error_type="TimeoutError",
        )

    @pytest.mark.asyncio
    async def test_release_emits_warning_on_redis_failure(self, store):
        store._redis.delete = AsyncMock(side_effect=OSError("network unreachable"))
        store._last_redis_warning = float("-inf")

        with patch("app.core.idempotency.logger") as mock_logger:
            await store.release("key-1")

        mock_logger.warning.assert_called_once_with(
            "idempotency_redis_fallback",
            op="release",
            error="network unreachable",
            error_type="OSError",
        )
