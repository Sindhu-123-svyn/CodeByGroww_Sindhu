import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import ChangeEvent, CorporateAction, PriceTick, Symbol, SymbolBaseline
from app.services.errors import SymbolDelistedError, SymbolNotFoundError

_RANGE_DAYS = {"30d": 30, "90d": 90, "1y": 365}


async def search_symbols(db: AsyncSession, q: str, exchange_code: str | None) -> list[Symbol]:
    stmt = select(Symbol).where(
        or_(Symbol.ticker.ilike(f"{q}%"), Symbol.name.ilike(f"%{q}%"))
    )
    if exchange_code:
        stmt = stmt.where(Symbol.exchange_code == exchange_code)
    stmt = stmt.order_by(Symbol.ticker).limit(20)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def validate_symbol(db: AsyncSession, symbol_id: uuid.UUID) -> Symbol:
    """Friendly pre-check layered on top of the DB trigger that remains
    authoritative on the actual add (design §3.8)."""
    symbol = await db.get(Symbol, symbol_id)
    if symbol is None:
        raise SymbolNotFoundError(symbol_id)
    if symbol.status == "delisted":
        raise SymbolDelistedError(symbol_id)
    return symbol


async def get_symbol_detail(db: AsyncSession, symbol_id: uuid.UUID, range_key: str = "90d") -> dict:
    """Full drill-down view (README §3.2) — works for delisted symbols too;
    only a truly unknown id is a 404 (plan §2.5)."""
    symbol = await db.get(Symbol, symbol_id)
    if symbol is None:
        raise SymbolNotFoundError(symbol_id)

    settings = get_settings()
    days = _RANGE_DAYS.get(range_key, 90)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    ticks = list(
        (
            await db.execute(
                select(PriceTick)
                .where(PriceTick.symbol_id == symbol_id, PriceTick.tick_time >= since)
                .order_by(PriceTick.tick_time)
            )
        )
        .scalars()
        .all()
    )

    latest_tick = ticks[-1] if ticks else None
    latest_quote = None
    if latest_tick is not None:
        latest_quote = {
            "price": float(latest_tick.price),
            "volume": latest_tick.volume,
            "tick_time": latest_tick.tick_time,
            "source": latest_tick.source_code,
            "is_stale": latest_tick.is_stale,
        }

    baseline = await db.get(SymbolBaseline, symbol_id)
    if baseline is None:
        baseline_out = {
            "avg_volume_20d": None,
            "stddev_30d": None,
            "ma_20d": None,
            "high_52w": None,
            "low_52w": None,
            "sample_size": 0,
            "status": "building",
        }
    else:
        is_ready = (
            baseline.sample_size >= settings.baseline_min_sample_size and baseline.stddev_30d is not None
        )
        baseline_out = {
            "avg_volume_20d": float(baseline.avg_volume_20d) if baseline.avg_volume_20d is not None else None,
            "stddev_30d": float(baseline.stddev_30d) if baseline.stddev_30d is not None else None,
            "ma_20d": float(baseline.ma_20d) if baseline.ma_20d is not None else None,
            "high_52w": float(baseline.high_52w) if baseline.high_52w is not None else None,
            "low_52w": float(baseline.low_52w) if baseline.low_52w is not None else None,
            "sample_size": baseline.sample_size,
            "status": "ready" if is_ready else "building",
        }

    events = list(
        (
            await db.execute(
                select(ChangeEvent)
                .where(ChangeEvent.symbol_id == symbol_id)
                .order_by(ChangeEvent.event_time.desc())
                .limit(20)
            )
        )
        .scalars()
        .all()
    )

    actions = list(
        (await db.execute(select(CorporateAction).where(CorporateAction.symbol_id == symbol_id)))
        .scalars()
        .all()
    )

    return {
        "symbol": symbol,
        "latest_quote": latest_quote,
        "baseline": baseline_out,
        "price_history": [
            {
                "tick_time": t.tick_time,
                "price": float(t.price),
                "volume": t.volume,
                "source": t.source_code,
                "is_stale": t.is_stale,
            }
            for t in ticks
        ],
        "recent_events": [
            {
                "event_type": e.event_type,
                "severity": e.severity,
                "score": float(e.score),
                "event_time": e.event_time,
                "why": e.details.get("reason", ""),
            }
            for e in events
        ],
        "corporate_actions": [
            {
                "action_type": a.action_type,
                "ratio": float(a.ratio) if a.ratio is not None else None,
                "amount": float(a.amount) if a.amount is not None else None,
                "effective_date": a.effective_date,
                "applied_at": a.applied_at,
            }
            for a in actions
        ],
        "news": [],
    }
