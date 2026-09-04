"""Centralized Redis key naming + TTLs (plan §5) — the single place that
defines cache shape, so invalidation logic elsewhere never has to guess a
key format.
"""
import uuid

QUOTE_TTL_SECONDS = 60
DIGEST_TTL_SECONDS = 45
RATE_LIMIT_TTL_SECONDS = 60


def quote_key(symbol_id: uuid.UUID) -> str:
    return f"quote:{symbol_id}"


def digest_key(user_id: uuid.UUID, watchlist_id: uuid.UUID | None) -> str:
    return f"digest:{user_id}:{watchlist_id or 'all'}"


def symbol_subscribers_key(symbol_id: uuid.UUID) -> str:
    """A Redis SET of "user_id:watchlist_id" pairs — maintained on
    watchlist-item add/remove, read by the Signal Engine to know exactly
    which digest cache keys to invalidate on a new change_event, rather
    than a broad SCAN/flush (plan §5)."""
    return f"symbol_subscribers:{symbol_id}"


def rate_limit_watchlist_add_key(user_id: uuid.UUID) -> str:
    return f"ratelimit:watchlist_add:{user_id}"
