"""Tests for IdempotencyStore Redis fallback warning debouncing."""

from unittest.mock import AsyncMock, patch

import pytest

from app.core.idempotency import IdempotencyStore


@pytest.fixture
def store():
    with patch("app.core.idempotency.settings") as mock_settings:
        mock_settings.redis_url = "redis://localhost:6379"
        mock_settings.redis_socket_timeout_seconds = 5
        mock_settings.redis_connect_timeout_seconds = 5
        with patch("app.core.idempotency.redis.from_url", return_value=AsyncMock()):
            s = IdempotencyStore()
        s._redis = AsyncMock()
        yield s


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
