"""
Rate Limiter configuration for the application.
"""

import hashlib
import time
from typing import Any

from redis.backoff import NoBackoff
from redis.retry import Retry

from fastapi import Request
from prometheus_client import Counter
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.settings import settings


# Paths that use local rate limiting when Redis is unavailable.
# Read-only portfolio endpoints use fail-open (allow through) to remain available.
FAIL_CLOSED_PATHS = frozenset({"/api/v1/contact"})


def get_client_ip(request: Request) -> str:
    """Returns the real client IP.

    - strict_proxy_mode ON (TRUSTED_PROXY_IPS configured): trusts forwarded headers
      only when REMOTE_ADDR is a known proxy. Prevents IP spoofing bypass.
    - strict_proxy_mode OFF (default, Koyeb/dynamic IPs): legacy depth-based mode.
    """
    peer_ip = request.client.host if request.client else None

    if settings.strict_proxy_mode:
        if peer_ip not in settings.trusted_proxy_ip_set:
            # Peer is not a known proxy — ignore spoofed forwarding headers
            return peer_ip or "unknown"

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for and settings.trusted_proxy_depth > 0:
        ips = [ip.strip() for ip in forwarded_for.split(",")]
        trusted_index = max(0, len(ips) - settings.trusted_proxy_depth)
        return ips[trusted_index]

    real_ip = request.headers.get("x-real-ip")
    if real_ip and (settings.strict_proxy_mode or settings.trusted_proxy_depth > 0):
        return real_ip.strip()

    return get_remote_address(request)


def get_email_or_ip_key(request: Request) -> str:
    """
    Returns the request identity (email) previously set by middleware, or falls
    back to client IP. Synchronous for full compatibility with the Limiter.
    """
    # Identity is populated by MiddlewareRequisicao for POST /api/v1/contact
    identity = getattr(request.state, "identity", None)
    if identity:
        return identity

    return get_client_ip(request)


def get_contact_fingerprint_key(request: Request) -> str:
    """Combines IP and user-agent to limit unauthenticated bursts."""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")
    fingerprint = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()[:16]
    return f"fingerprint:{fingerprint}"


# Initialize limiter using client IP as the default key.
# When REDIS_URL is set, uses Redis as the backend storage for horizontal scaling.
# SlowAPI annotates storage options as strings, but forwards Redis client values.
_storage_options: dict[str, Any] = {}
if settings.redis_url and settings.redis_url.startswith(
    ("redis://", "rediss://", "redis+unix://")
):
    _storage_options = {
        "socket_timeout": settings.rate_limit_redis_timeout_seconds,
        "socket_connect_timeout": settings.rate_limit_redis_timeout_seconds,
        "retry": Retry(NoBackoff(), 0),
        "retry_on_timeout": False,
    }
limiter = Limiter(
    key_func=get_client_ip,
    strategy="fixed-window",
    storage_uri=settings.redis_url or "memory://",
    storage_options=_storage_options,
)

# Fallback in-memory limiter used when the primary backend (Redis) is
# unavailable.  Sensitive paths degrade to local rate limiting instead
# of returning a hard HTTP 503, keeping the contact form functional
# while still providing single-instance anti-abuse protection.
_fallback_limiter = Limiter(
    key_func=get_client_ip,
    strategy="fixed-window",
    storage_uri="memory://",
)

REDIS_UNAVAILABLE_COUNTER = Counter(
    "rate_limit_backend_unavailable_total",
    "Redis unavailable during rate limit evaluation",
    ["path", "mode"],
)


_redis_disabled_until = 0.0
_BREAKER_COOLDOWN_SECONDS = 30.0


def check_rate_limit(request: Request, limit_string: str, key_func=get_email_or_ip_key):
    """
    Manually applies a rate limit hit and raises RateLimitExceeded if the limit is reached.

    Fail strategy:
    - Sensitive paths (FAIL_CLOSED_PATHS): degraded mode via in-memory fallback
      when Redis is unavailable.
    - Read-only paths: fail-open (allows request through) to keep portfolio data available.
    """
    from limits import parse_many
    from slowapi.errors import RateLimitExceeded

    # Mock to satisfy RateLimitExceeded constructor (expects an object with `error_message`)
    class MockLimit:
        def __init__(self, msg):
            self.error_message = msg

    global _redis_disabled_until

    key = key_func(request)
    is_sensitive = request.url.path in FAIL_CLOSED_PATHS
    for limit in parse_many(limit_string):
        if time.monotonic() >= _redis_disabled_until:
            try:
                if not limiter.limiter.hit(limit, key):
                    raise RateLimitExceeded(MockLimit(str(limit)))  # type: ignore
                _redis_disabled_until = 0.0
                continue
            except RateLimitExceeded:
                raise
            except Exception as exc:
                _redis_disabled_until = time.monotonic() + _BREAKER_COOLDOWN_SECONDS
                import structlog

                structlog.get_logger(__name__).warning(
                    "rate_limiter_backend_unavailable",
                    error=str(exc),
                    error_type=type(exc).__name__,
                    path=request.url.path,
                    limit=str(limit),
                    mode="degraded" if is_sensitive else "fail_open",
                )

        try:
            REDIS_UNAVAILABLE_COUNTER.labels(
                path=request.url.path,
                mode="degraded" if is_sensitive else "fail_open",
            ).inc()
        except Exception:
            pass  # Metrics must never fail the request.

        if is_sensitive:
            try:
                if not _fallback_limiter.limiter.hit(limit, key):
                    raise RateLimitExceeded(MockLimit(str(limit)))  # type: ignore
            except RateLimitExceeded:
                raise
            except Exception:
                pass  # Preserve last-resort fail-open if memory storage fails.
