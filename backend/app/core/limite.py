"""
Configuração do Rate Limiter para a aplicação.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.configuracao import configuracoes
import hashlib


def get_client_ip(request: Request) -> str:
    """Returns the real client IP, preferring trusted proxy headers."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return get_remote_address(request)


def get_email_or_ip_key(request: Request) -> str:
    """
    Returns the request identity (email) previously set by middleware, or falls
    back to client IP. Synchronous for full compatibility with the Limiter.
    """
    # Identity is populated by MiddlewareRequisicao for POST /api/v1/contato
    identidade = getattr(request.state, "identidade", None)
    if identidade:
        return identidade

    return get_client_ip(request)


def get_contact_fingerprint_key(request: Request) -> str:
    """Combina IP e user-agent para limitar bursts não autenticados."""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent", "unknown")
    fingerprint = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()[:16]
    return f"fingerprint:{fingerprint}"


# Initialize limiter using client IP as the default key.
# When REDIS_URL is set, uses Redis as the backend storage for horizontal scaling.
limiter = Limiter(
    key_func=get_client_ip,
    strategy="fixed-window",
    storage_uri=configuracoes.redis_url or "memory://",
)


def check_rate_limit(request: Request, limit_string: str, key_func=get_email_or_ip_key):
    """
    Manually applies a rate limit hit and raises RateLimitExceeded if the limit is reached.
    """
    from slowapi.errors import RateLimitExceeded
    from limits import parse_many

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
            # Ao invés de retornar 500, falhamos 'aberto' permitindo a requisição
            continue
