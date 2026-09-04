"""Shared "latest quote for a symbol" lookup — cache-aside against the
write-through Redis quote cache (plan §5), falling back to Postgres on a
miss. Used by both the digest and the watchlist-items endpoints so the two
never drift on shape or caching behavior.
"""
import uuid

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PriceTick
from app.services.quote_cache import read_quote


async def get_latest_quote(db: AsyncSession, redis: Redis | None, symbol_id: uuid.UUID) -> dict | None:
    cached = await read_quote(redis, symbol_id)
    if cached is not None:
        return cached
    latest_tick = await db.scalar(
        select(PriceTick).where(PriceTick.symbol_id == symbol_id).order_by(PriceTick.tick_time.desc()).limit(1)
    )
    if latest_tick is None:
        return None
    return {
        "price": float(latest_tick.price),
        "open": float(latest_tick.open) if latest_tick.open is not None else None,
        "volume": latest_tick.volume,
        "tick_time": latest_tick.tick_time,
        "source": latest_tick.source_code,
        "is_stale": latest_tick.is_stale,
    }
