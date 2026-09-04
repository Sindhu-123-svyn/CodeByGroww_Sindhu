import uuid
from datetime import datetime, timezone

from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache_keys import (
    RATE_LIMIT_TTL_SECONDS,
    digest_key,
    rate_limit_watchlist_add_key,
    symbol_subscribers_key,
)
from app.db.models import Symbol, Watchlist, WatchlistItem
from app.services.errors import (
    DuplicateWatchlistItemError,
    InvalidReorderError,
    SymbolDelistedError,
    SymbolNotFoundError,
    WatchlistItemLimitExceededError,
    WatchlistItemNotFoundError,
    WatchlistNotFoundError,
)
from app.services.quotes import get_latest_quote


async def _cache_get(redis: Redis | None, key: str) -> str | None:
    if redis is None:
        return None
    try:
        return await redis.get(key)
    except Exception:  # noqa: BLE001 — cache is best-effort (design §2.3)
        return None


async def _cache_set(redis: Redis | None, key: str, value: str, ttl: int) -> None:
    if redis is None:
        return
    try:
        await redis.set(key, value, ex=ttl)
    except Exception:  # noqa: BLE001
        pass


async def _cache_delete(redis: Redis | None, *keys: str) -> None:
    if redis is None or not keys:
        return
    try:
        await redis.delete(*keys)
    except Exception:  # noqa: BLE001
        pass


async def create_watchlist(db: AsyncSession, user_id: uuid.UUID, name: str | None) -> Watchlist:
    # Only set `name` on the model if provided — leaving it untouched lets
    # Postgres's server_default('My Watchlist') apply, rather than the ORM
    # sending an explicit value.
    watchlist = Watchlist(user_id=user_id, **({"name": name} if name else {}))
    db.add(watchlist)
    await db.commit()
    await db.refresh(watchlist)
    return watchlist


async def list_watchlists(db: AsyncSession, user_id: uuid.UUID) -> list[tuple[Watchlist, int]]:
    stmt = (
        select(Watchlist, func.count(WatchlistItem.id))
        .outerjoin(WatchlistItem, WatchlistItem.watchlist_id == Watchlist.id)
        .where(Watchlist.user_id == user_id)
        .group_by(Watchlist.id)
        .order_by(Watchlist.created_at)
    )
    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def get_owned_watchlist(db: AsyncSession, user_id: uuid.UUID, watchlist_id: uuid.UUID) -> Watchlist:
    watchlist = await db.scalar(
        select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == user_id)
    )
    if watchlist is None:
        # 404, not 403 — never confirm a watchlist id exists for someone else
        # (plan §6).
        raise WatchlistNotFoundError(watchlist_id)
    return watchlist


async def list_items(
    db: AsyncSession, user_id: uuid.UUID, watchlist_id: uuid.UUID, redis: Redis | None = None
) -> list[dict]:
    """Backing GET /watchlists/{id}/items — needed by the frontend's
    watchlist management page to show/remove/reorder items after a page
    load, since the add/reorder mutation responses only cover the moment
    of that call. Also attaches each item's latest_quote (same cache-aside
    lookup the digest uses) so the row can show a live price + day change,
    not just the static symbol/position fields."""
    await get_owned_watchlist(db, user_id, watchlist_id)
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.watchlist_id == watchlist_id)
        .order_by(WatchlistItem.position)
    )
    items = list(result.scalars().all())
    return [
        {
            "id": item.id,
            "symbol": item.symbol,
            "position": item.position,
            "last_viewed_at": item.last_viewed_at,
            "added_at": item.added_at,
            "latest_quote": await get_latest_quote(db, redis, item.symbol_id),
        }
        for item in items
    ]


async def rename_watchlist(
    db: AsyncSession, user_id: uuid.UUID, watchlist_id: uuid.UUID, name: str
) -> Watchlist:
    watchlist = await get_owned_watchlist(db, user_id, watchlist_id)
    watchlist.name = name
    await db.commit()
    await db.refresh(watchlist)
    return watchlist


async def delete_watchlist(db: AsyncSession, user_id: uuid.UUID, watchlist_id: uuid.UUID) -> None:
    watchlist = await get_owned_watchlist(db, user_id, watchlist_id)
    await db.delete(watchlist)  # ON DELETE CASCADE removes its items
    await db.commit()


def _translate_item_insert_error(exc: DBAPIError, symbol_id: uuid.UUID) -> Exception:
    """Pattern-matches the message text a DB trigger's RAISE EXCEPTION (or a
    UNIQUE constraint violation) surfaces as, and maps it to the right
    DomainError — the concrete mechanism for "catch the trigger's
    RAISE EXCEPTION and turn it into a clean 4xx" (plan §6).
    """
    message = str(getattr(exc, "orig", exc)).lower()
    if "delisted" in message:
        return SymbolDelistedError(symbol_id)
    if "unknown symbol_id" in message:
        return SymbolNotFoundError(symbol_id)
    if "item limit" in message:
        return WatchlistItemLimitExceededError(0)
    if "duplicate key" in message:
        return DuplicateWatchlistItemError(symbol_id)
    return exc  # unrecognized DB error — let it surface as a 500, not silently swallowed


async def add_item(
    db: AsyncSession,
    user_id: uuid.UUID,
    watchlist_id: uuid.UUID,
    symbol_id: uuid.UUID,
    redis: Redis | None = None,
) -> WatchlistItem:
    await get_owned_watchlist(db, user_id, watchlist_id)

    # Soft rate-limit pre-check (plan §5): a fast-fail cache of a recent DB
    # rejection, in front of the authoritative enforce_watchlist_item_limit
    # trigger — never the source of truth, purely avoids a DB round trip for
    # an obviously-over-limit user.
    if await _cache_get(redis, rate_limit_watchlist_add_key(user_id)):
        raise WatchlistItemLimitExceededError(0)

    # Friendly pre-check (defense in depth) — the DB triggers
    # validate_symbol_active / enforce_watchlist_item_limit remain the
    # source of truth against the pre-check/insert race (plan §2.2).
    symbol = await db.get(Symbol, symbol_id)
    if symbol is None:
        raise SymbolNotFoundError(symbol_id)
    if symbol.status == "delisted":
        raise SymbolDelistedError(symbol_id)

    next_position = await db.scalar(
        select(func.coalesce(func.max(WatchlistItem.position), 0) + 1).where(
            WatchlistItem.watchlist_id == watchlist_id
        )
    )
    item = WatchlistItem(watchlist_id=watchlist_id, symbol_id=symbol_id, position=next_position)
    db.add(item)
    try:
        await db.commit()
    except DBAPIError as exc:
        await db.rollback()
        translated = _translate_item_insert_error(exc, symbol_id)
        if isinstance(translated, WatchlistItemLimitExceededError):
            await _cache_set(redis, rate_limit_watchlist_add_key(user_id), "1", RATE_LIMIT_TTL_SECONDS)
        raise translated from exc

    # Track this (user, watchlist) as a subscriber of the symbol so the
    # Signal Engine can invalidate exactly the right digest cache keys on a
    # new change_event (plan §5) — best-effort, a stale/missing entry only
    # costs an extra cache-delete attempt, it never causes wrong data since
    # the digest is always correctly recomputed from Postgres on a miss.
    if redis is not None:
        try:
            await redis.sadd(symbol_subscribers_key(symbol_id), f"{user_id}:{watchlist_id}")
        except Exception:  # noqa: BLE001
            pass

    # lazy="joined" on WatchlistItem.symbol means this re-fetch eager-loads
    # the symbol in one query, ready for WatchlistItemOut.
    return await db.scalar(select(WatchlistItem).where(WatchlistItem.id == item.id))


async def remove_item(
    db: AsyncSession,
    user_id: uuid.UUID,
    watchlist_id: uuid.UUID,
    item_id: uuid.UUID,
    redis: Redis | None = None,
) -> None:
    await get_owned_watchlist(db, user_id, watchlist_id)
    item = await db.scalar(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id, WatchlistItem.watchlist_id == watchlist_id
        )
    )
    if item is None:
        raise WatchlistItemNotFoundError(item_id)
    symbol_id = item.symbol_id
    await db.delete(item)
    await db.commit()
    if redis is not None:
        try:
            await redis.srem(symbol_subscribers_key(symbol_id), f"{user_id}:{watchlist_id}")
        except Exception:  # noqa: BLE001
            pass


async def reorder_items(
    db: AsyncSession, user_id: uuid.UUID, watchlist_id: uuid.UUID, ordered_item_ids: list[uuid.UUID]
) -> list[WatchlistItem]:
    await get_owned_watchlist(db, user_id, watchlist_id)
    result = await db.execute(select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id))
    existing = {item.id: item for item in result.scalars().all()}

    if set(ordered_item_ids) != set(existing.keys()):
        raise InvalidReorderError(
            "ordered_item_ids must be exactly the set of item ids currently in this watchlist"
        )

    for position, item_id in enumerate(ordered_item_ids, start=1):
        existing[item_id].position = position
    await db.commit()

    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.watchlist_id == watchlist_id)
        .order_by(WatchlistItem.position)
    )
    return list(result.scalars().all())


async def acknowledge_item(
    db: AsyncSession,
    user_id: uuid.UUID,
    watchlist_id: uuid.UUID,
    item_id: uuid.UUID,
    as_of: datetime | None,
    redis: Redis | None = None,
) -> WatchlistItem:
    """Explicit acknowledgment, never on every page load (design §1.4) — the
    DB trigger enforce_last_viewed_at_forward silently clamps any rewind
    attempt to the existing value (design §3.7 advance-only rule), so this
    is safe to call with a stale `as_of` without special-casing it here.
    """
    await get_owned_watchlist(db, user_id, watchlist_id)
    item = await db.scalar(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id, WatchlistItem.watchlist_id == watchlist_id
        )
    )
    if item is None:
        raise WatchlistItemNotFoundError(item_id)
    item.last_viewed_at = as_of or datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    # A stale cached digest must never keep showing an acknowledged event as
    # unseen (plan §5) — invalidate proactively, don't wait on TTL.
    await _cache_delete(redis, digest_key(user_id, watchlist_id), digest_key(user_id, None))
    return item


async def acknowledge_all(
    db: AsyncSession,
    user_id: uuid.UUID,
    watchlist_id: uuid.UUID,
    as_of: datetime | None,
    redis: Redis | None = None,
) -> list[WatchlistItem]:
    await get_owned_watchlist(db, user_id, watchlist_id)
    result = await db.execute(select(WatchlistItem).where(WatchlistItem.watchlist_id == watchlist_id))
    items = list(result.scalars().all())
    ts = as_of or datetime.now(timezone.utc)
    for item in items:
        item.last_viewed_at = ts
    await db.commit()
    for item in items:
        await db.refresh(item)
    await _cache_delete(redis, digest_key(user_id, watchlist_id), digest_key(user_id, None))
    return items
