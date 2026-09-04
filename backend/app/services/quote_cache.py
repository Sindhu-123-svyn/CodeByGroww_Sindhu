"""Latest-quote cache: write-through from the Ingestion Worker, read-through
(cache-aside, falling back to Postgres on a miss) from the API (plan §5).
Cache is always best-effort — a Redis outage must never break correctness.
"""
import json
import uuid

from redis.asyncio import Redis

from app.core.cache_keys import QUOTE_TTL_SECONDS, quote_key


async def write_quote(redis: Redis | None, symbol_id: uuid.UUID, quote: dict) -> None:
    if redis is None:
        return
    try:
        await redis.set(quote_key(symbol_id), json.dumps(quote, default=str), ex=QUOTE_TTL_SECONDS)
    except Exception:  # noqa: BLE001 — best-effort only, never blocks ingestion
        pass


async def read_quote(redis: Redis | None, symbol_id: uuid.UUID) -> dict | None:
    if redis is None:
        return None
    try:
        cached = await redis.get(quote_key(symbol_id))
        return json.loads(cached) if cached else None
    except Exception:  # noqa: BLE001
        return None
