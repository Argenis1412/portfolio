"""
Rate Limiter configuration for the application.
"""

import hashlib

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.settings import settings


def get_client_ip(request: Request) -> str:
    """Returns the real client IP, only trusting the N-th hop from the right."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ips = [ip.strip() for ip in forwarded_for.split(",")]
        trusted_index = max(0, len(ips) - settings.trusted_proxy_depth - 1)
        return ips[trusted_index]

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return get_remote_address(request)


def get_email_or_ip_key(request: Request) -> str:
    """
    Returns the request identity (email) previously set by middleware, or falls
    back to client IP. Synchronous for full compatibility with the Limiter.
    """
    # Identity is populated by MiddlewareRequisicao for POST /api/v1/contact
    identity = getattr(request.state, "identidade", None)
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
limiter = Limiter(
    key_func=get_client_ip,
    strategy="fixed-window",
    storage_uri=settings.redis_url or "memory://",
)


def check_rate_limit(request: Request, limit_string: str, key_func=get_email_or_ip_key):
    """
    Manually applies a rate limit hit and raises RateLimitExceeded if the limit is reached.
    """
    from limits import parse_many
    from slowapi.errors import RateLimitExceeded

    # Mock to satisfy RateLimitExceeded constructor (expects an object with `error_message`)
    class MockLimit:
        def __init__(self, msg):
            self.error_message = msg

    key = key_func(request)
    # Parse the limit string (e.g. "10/day" -> [Limit(...)])
    for limit in parse_many(limit_string):
        try:
            if not limiter.limiter.hit(limit, key):
                raise RateLimitExceeded(MockLimit(str(limit)))  # type: ignore
        except RateLimitExceeded:
            raise
        except Exception as e:
            # Fallback (Fail-open) in case of Redis connection drops/timeouts
            import structlog

            logger = structlog.get_logger(__name__)
            logger.warning(
                "rate_limiter_redis_fallback_open",
                error=str(e),
                limit=str(limit),
            )
            # Instead of returning 500, we fail 'open' allowing the request
            continue
