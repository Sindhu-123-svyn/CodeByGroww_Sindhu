"""GET /digest core logic — the literal since-last-visit diff (design §1.4):
for each watchlist item, change_events WHERE symbol_id = item.symbol_id AND
event_time > COALESCE(item.last_viewed_at, '-infinity'). This is the single
query the whole product's differentiator is built on.
"""
import json
import uuid
from datetime import datetime, timezone

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.cache_keys import DIGEST_TTL_SECONDS, digest_key
from app.db.models import ChangeEvent, SymbolBaseline, Watchlist, WatchlistItem
from app.services.errors import WatchlistNotFoundError
from app.services.quotes import get_latest_quote

# Ranked most-severe first — determines which bucket a symbol lands in.
_SEVERITY_ORDER = ["major", "notable", "minor", "no_change"]
_SEVERITY_RANK = {sev: i for i, sev in enumerate(_SEVERITY_ORDER)}


async def build_digest(
    db: AsyncSession,
    user_id: uuid.UUID,
    watchlist_id: uuid.UUID | None,
    severity_min: str | None,
    redis: Redis | None = None,
) -> dict:
    settings = get_settings()

    # Digest cache is only served for the unfiltered (no severity_min) case
    # — simplest correct behavior without caching every filter combination.
    cache_key = digest_key(user_id, watchlist_id)
    if redis is not None and severity_min is None:
        try:
            cached = await redis.get(cache_key)
        except Exception:  # noqa: BLE001 — best-effort
            cached = None
        if cached:
            return json.loads(cached)

    if watchlist_id is not None:
        watchlist = await db.scalar(
            select(Watchlist).where(Watchlist.id == watchlist_id, Watchlist.user_id == user_id)
        )
        if watchlist is None:
            raise WatchlistNotFoundError(watchlist_id)

    stmt = select(WatchlistItem).join(Watchlist).where(Watchlist.user_id == user_id)
    if watchlist_id is not None:
        stmt = stmt.where(WatchlistItem.watchlist_id == watchlist_id)
    items = list((await db.execute(stmt)).scalars().unique().all())

    groups: dict[str, list[dict]] = {sev: [] for sev in _SEVERITY_ORDER}

    for item in items:
        baseline = await db.get(SymbolBaseline, item.symbol_id)
        baseline_status = "ready"
        if baseline is None or baseline.sample_size < settings.baseline_min_sample_size or baseline.stddev_30d is None:
            baseline_status = "building"

        # The literal §1.4 diff: events strictly after this item's own
        # last_viewed_at cursor (NULL = never viewed = everything is new).
        event_stmt = select(ChangeEvent).where(ChangeEvent.symbol_id == item.symbol_id)
        if item.last_viewed_at is not None:
            event_stmt = event_stmt.where(ChangeEvent.event_time > item.last_viewed_at)
        event_stmt = event_stmt.order_by(ChangeEvent.event_time.desc())
        events = list((await db.execute(event_stmt)).scalars().all())

        latest_quote = await get_latest_quote(db, redis, item.symbol_id)

        event_outs = [
            {
                "event_type": e.event_type,
                "severity": e.severity,
                "score": float(e.score),
                "event_time": e.event_time,
                "why": e.details.get("reason", ""),
                "details": e.details,
            }
            for e in events
        ]

        attention_score = max((e["score"] for e in event_outs), default=0.0)
        top_severity = "no_change"
        for sev in _SEVERITY_ORDER:
            if any(e["severity"] == sev for e in event_outs):
                top_severity = sev
                break

        entry = {
            "watchlist_item_id": item.id,
            # Plain dict, not the ORM object — keeps this JSON-cacheable and
            # still validates fine against SymbolOut via Pydantic.
            "symbol": {
                "id": item.symbol.id,
                "ticker": item.symbol.ticker,
                "exchange_code": item.symbol.exchange_code,
                "name": item.symbol.name,
                "status": item.symbol.status,
            },
            "last_viewed_at": item.last_viewed_at,
            "latest_quote": latest_quote,
            "baseline_status": baseline_status,
            "events_since_last_view": event_outs,
            "attention_score": attention_score,
        }
        groups[top_severity].append(entry)

    result = {"generated_at": datetime.now(timezone.utc), "groups": groups}

    if redis is not None and severity_min is None:
        try:
            await redis.set(cache_key, json.dumps(result, default=str), ex=DIGEST_TTL_SECONDS)
        except Exception:  # noqa: BLE001 — best-effort
            pass

    if severity_min and severity_min in _SEVERITY_RANK:
        min_rank = _SEVERITY_RANK[severity_min]
        groups = {sev: entries for sev, entries in groups.items() if _SEVERITY_RANK[sev] <= min_rank}
        result = {"generated_at": result["generated_at"], "groups": groups}

    return result
