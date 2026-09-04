"""Single shared async Redis client (plan §5). Injected via get_redis() for
request handlers; workers call get_redis_client() directly since they run
outside FastAPI's dependency-injection context.
"""
import redis.asyncio as redis

from app.config import get_settings

_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis_client


async def get_redis():
    """FastAPI dependency. Cache is best-effort everywhere it's used — if
    Redis is unreachable, callers must fail open to the DB, never fail the
    request (design §2.3 graceful degradation)."""
    yield get_redis_client()
