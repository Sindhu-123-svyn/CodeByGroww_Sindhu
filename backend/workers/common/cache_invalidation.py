"""Proactive digest-cache invalidation triggered by a new ChangeEvent (plan
§5: "invalidated on new event write"). Used by the Signal Engine right
after it writes a new event for a symbol.
"""
import logging
import uuid

from app.core.cache_keys import digest_key, symbol_subscribers_key
from app.redis_client import get_redis_client

logger = logging.getLogger("workers.common.cache_invalidation")


async def invalidate_digest_for_symbol(symbol_id: uuid.UUID) -> None:
    """Best-effort — cache invalidation failing must never break the
    detection job (design §2.3 graceful degradation)."""
    try:
        redis = get_redis_client()
        members = await redis.smembers(symbol_subscribers_key(symbol_id))
        if not members:
            return
        keys: set[str] = set()
        for member in members:
            user_id_str, watchlist_id_str = member.split(":", 1)
            keys.add(digest_key(uuid.UUID(user_id_str), uuid.UUID(watchlist_id_str)))
            keys.add(digest_key(uuid.UUID(user_id_str), None))
        if keys:
            await redis.delete(*keys)
    except Exception:  # noqa: BLE001 — cache is never allowed to break the job
        logger.warning("digest cache invalidation failed for symbol %s", symbol_id, exc_info=True)
