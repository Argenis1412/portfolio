"""Redis client configuration and shared queue client lifecycle."""

import structlog
from redis import asyncio as redis

from app.settings import settings

logger = structlog.get_logger(__name__)

_redis_client: redis.Redis | None = None


def create_redis_client(
    redis_url: str,
    *,
    blocking: bool = False,
    health_check_interval: int = 0,
    retry_on_timeout: bool = False,
) -> redis.Redis:
    """Build a client without connecting; blocking consumers need longer timeouts."""
    return redis.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=60 if blocking else settings.redis_socket_timeout_seconds,
        socket_connect_timeout=10
        if blocking
        else settings.redis_connect_timeout_seconds,
        health_check_interval=health_check_interval,
        retry_on_timeout=retry_on_timeout,
    )


async def dispose_all() -> None:
    """Close shared Redis connections on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.close()
            logger.info("redis_client_closed")
        except Exception as e:
            logger.error("redis_client_close_failed", error=str(e))
        finally:
            _redis_client = None


def init_redis(redis_url: str | None = None) -> redis.Redis | None:
    """Initializes and returns the shared Redis client singleton."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    effective_url = redis_url or settings.redis_url
    if not effective_url:
        logger.warning("redis_not_configured")
        return None

    _redis_client = create_redis_client(effective_url, retry_on_timeout=True)
    logger.info("redis_client_initialized")
    return _redis_client


def get_redis() -> redis.Redis:
    """Returns the shared Redis client, initializing it if needed."""
    client = init_redis()
    if client is None:
        raise RuntimeError("Redis is not configured")
    return client
