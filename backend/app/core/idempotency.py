from dataclasses import dataclass

import threading
import time
from typing import Any, Dict, Optional

import structlog
from fastapi import Header, HTTPException, Request, status
from pydantic import BaseModel

from app.settings import settings
from app.core.infrastructure import create_redis_client

logger = structlog.get_logger(__name__)
_REDIS_WARNING_INTERVAL = 60.0


@dataclass
class Reservation:
    key: str
    token: str
    backend: str = "memory"
    attempted: bool = False


_RELEASE = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
"""
_FINALIZE = """
local current = redis.call('GET', KEYS[1])
if not current or current == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
    return 1
end
return 0
"""


class IdempotencyRecord(BaseModel):
    """Record of a cached response."""

    status_code: int
    content: Any
    timestamp: float
    in_progress: bool = False
    owner_token: str | None = None


class IdempotencyStore:
    """
    In-memory store for idempotency keys with Redis-backed persistence.
    Falls back to memory if Redis is unavailable (fail-open strategy).
    In production, use Redis to share state across multiple instances.
    """

    def __init__(
        self, max_size: int = 100, ttl_seconds: int = 3600, lock_ttl_seconds: int = 30
    ):
        """
        WARNING: The fallback in-memory cache is only safe when running with a single worker.
        In multi-worker environments this will lead to race conditions unless Redis is configured.

        Args:
            max_size: Maximum number of keys held in the in-memory fallback cache.
            ttl_seconds: TTL for finalized idempotency results (default 1h).
            lock_ttl_seconds: TTL for in-progress locks (default 30s).
                              Kept short so a crashed process does not block retries for 1h.
        """
        self._cache: Dict[str, IdempotencyRecord] = {}
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.lock_ttl_seconds = lock_ttl_seconds
        self._lock = threading.Lock()
        self._redis = None
        self._last_redis_warning: float = float("-inf")

        if settings.redis_url and not settings.redis_url.startswith("memory://"):
            self._redis = create_redis_client(
                settings.redis_url, health_check_interval=30
            )

    def _redis_key(self, key: str) -> str:
        return f"idempotency:{key}"

    def _log_redis_fallback(self, op: str, exc: Exception) -> None:
        now = time.monotonic()
        with self._lock:
            if now - self._last_redis_warning < _REDIS_WARNING_INTERVAL:
                return
            self._last_redis_warning = now
        logger.warning(
            "idempotency_redis_fallback",
            op=op,
            error=str(exc),
            error_type=type(exc).__name__,
        )

    async def _redis_get(self, key: str) -> Optional[IdempotencyRecord]:
        if not self._redis:
            return None

        try:
            payload = await self._redis.get(self._redis_key(key))
        except Exception as exc:
            self._log_redis_fallback("get", exc)
            return None

        if not payload:
            return None

        if payload.startswith("in_progress:"):
            return IdempotencyRecord(
                status_code=0,
                content={},
                timestamp=0,
                in_progress=True,
                owner_token=payload.split(":", 1)[1],
            )
        try:
            return IdempotencyRecord.model_validate_json(payload)
        except Exception:
            return None

    def _memory_get(self, key: str) -> Optional[IdempotencyRecord]:
        """Retrieves a record from in-memory cache if not expired."""
        with self._lock:
            record = self._cache.get(key)
            if not record:
                return None

            # Evict expired entries
            ttl = self.lock_ttl_seconds if record.in_progress else self.ttl_seconds
            if time.time() - record.timestamp > ttl:
                self._cache.pop(key, None)
                return None

            return record

    async def get(self, key: str) -> Optional[IdempotencyRecord]:
        record = await self._redis_get(key)
        if record is not None:
            return record

        return self._memory_get(key)

    async def set_in_progress(self, key: str, reservation: Reservation) -> bool:
        """Marks a key as in-progress (locked). Returns True if successfully acquired."""
        if self._redis:
            reservation.backend = "redis"
            reservation.attempted = True
            try:
                acquired = await self._redis.set(
                    self._redis_key(key),
                    f"in_progress:{reservation.token}",
                    ex=self.lock_ttl_seconds,  # Short TTL: crash won't block retries for 1h
                    nx=True,
                )
                reservation.attempted = bool(acquired)
                return bool(acquired)
            except Exception as exc:
                self._log_redis_fallback("set_in_progress", exc)

        reservation.backend = "memory"
        reservation.attempted = False
        with self._lock:
            if key in self._cache:
                record = self._cache[key]
                ttl = self.lock_ttl_seconds if record.in_progress else self.ttl_seconds
                if time.time() - record.timestamp <= ttl:
                    return False
                # If expired, overwrite

            if len(self._cache) >= self.max_size:
                first = next(iter(self._cache))
                self._cache.pop(first, None)

            reservation.attempted = True
            self._cache[key] = IdempotencyRecord(
                status_code=0,
                content={},
                timestamp=time.time(),
                in_progress=True,
                owner_token=reservation.token,
            )
            return True

    async def set(self, reservation: Reservation, status_code: int, content: Any):
        record = IdempotencyRecord(
            status_code=status_code, content=content, timestamp=time.time()
        )
        if reservation.backend == "redis":
            assert self._redis is not None
            try:
                await self._redis.register_script(_FINALIZE)(
                    keys=[self._redis_key(reservation.key)],
                    args=[
                        f"in_progress:{reservation.token}",
                        record.model_dump_json(),
                        self.ttl_seconds,
                    ],
                )
            except Exception as exc:
                self._log_redis_fallback("set", exc)
            return
        with self._lock:
            current = self._cache.get(reservation.key)
            if current is not None:
                ttl = self.lock_ttl_seconds if current.in_progress else self.ttl_seconds
                if time.time() - current.timestamp <= ttl:
                    if (
                        not current.in_progress
                        or current.owner_token != reservation.token
                    ):
                        return
            self._cache[reservation.key] = record

    async def release(self, reservation: Reservation) -> None:
        if reservation.backend == "redis":
            assert self._redis is not None
            try:
                await self._redis.register_script(_RELEASE)(
                    keys=[self._redis_key(reservation.key)],
                    args=[f"in_progress:{reservation.token}"],
                )
            except Exception as exc:
                self._log_redis_fallback("release", exc)
            return
        with self._lock:
            current = self._cache.get(reservation.key)
            if (
                current
                and current.in_progress
                and current.owner_token == reservation.token
            ):
                self._cache.pop(reservation.key, None)


# Global singleton — shared across all requests in the same process
store = IdempotencyStore()


class IdempotencyException(Exception):
    """Internal exception raised to short-circuit request processing and return a cached response."""

    def __init__(self, record: IdempotencyRecord):
        self.record = record
        super().__init__("Idempotency HIT")


async def get_idempotency_key(
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    legacy_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    """Resolve standard or legacy headers without reserving before validation."""
    if request.method != "POST":
        return None

    return idempotency_key or legacy_idempotency_key


async def verify_idempotency(
    effective_key: Optional[str], reservation: Reservation
) -> Optional[Reservation]:
    """Replay, reject, or reserve a key after the request body is validated."""
    if not effective_key:
        return None

    record = await store.get(effective_key)
    if record:
        if record.in_progress:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request already in progress",
            )
        raise IdempotencyException(record)

    # Lock key as in progress
    acquired = await store.set_in_progress(effective_key, reservation)
    if not acquired:
        record = await store.get(effective_key)
        if record and not record.in_progress:
            raise IdempotencyException(record)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Request already in progress"
        )

    return reservation
