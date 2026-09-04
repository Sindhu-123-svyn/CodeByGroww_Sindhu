"""Ingestion Worker run logic (design §2.1, §3.1-§3.8; plan §3). Runs as its
own OS process (`python -m workers.ingestion`), never imported by the
FastAPI app — the API layer only ever reads precomputed state (design §2.1).
"""
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CorporateAction, DataSource, Exchange, PriceTick, Symbol
from app.db.session import AsyncSessionLocal
from app.redis_client import get_redis_client
from app.services.quote_cache import write_quote
from workers.ingestion.market_data_client import CircuitOpenError, fetch_quote
from workers.ingestion.market_hours import MarketState, classify

logger = logging.getLogger("workers.ingestion")

DATA_SOURCE_CODE = "yfinance"
DATA_SOURCE_TRUST_PRIORITY = 1


async def _ensure_data_source(db: AsyncSession) -> None:
    existing = await db.get(DataSource, DATA_SOURCE_CODE)
    if existing is None:
        db.add(DataSource(code=DATA_SOURCE_CODE, trust_priority=DATA_SOURCE_TRUST_PRIORITY))
        await db.commit()


async def _apply_pending_corporate_actions(db: AsyncSession, symbol: Symbol) -> None:
    """Marks due, unapplied corporate actions as applied (design §3.6).
    Never mutates price_ticks — the Signal Engine's baseline math adjusts
    historical prices at read time using these rows.
    """
    today = date.today()
    result = await db.execute(
        select(CorporateAction).where(
            CorporateAction.symbol_id == symbol.id,
            CorporateAction.applied_at.is_(None),
            CorporateAction.effective_date <= today,
        )
    )
    actions = list(result.scalars().all())
    if not actions:
        return
    for action in actions:
        action.applied_at = datetime.now(timezone.utc)
    await db.commit()


async def ingest_symbol(db: AsyncSession, symbol: Symbol, exchange: Exchange, settings) -> PriceTick | None:
    now = datetime.now(timezone.utc)
    state = classify(now, exchange.timezone, exchange.open_time, exchange.close_time)

    try:
        quote = await fetch_quote(symbol.ticker)
    except CircuitOpenError:
        logger.warning("circuit open, skipping %s this run", symbol.ticker)
        return None
    except Exception:
        logger.exception("failed to fetch quote for %s after retries", symbol.ticker)
        return None

    tick_time = quote.tick_time
    if tick_time.tzinfo is None:
        tick_time = tick_time.replace(tzinfo=timezone.utc)

    # Past the staleness threshold -> excluded from detection by the Signal
    # Engine (design §3.1), but still recorded (append-only history).
    # The threshold only applies while the market is OPEN (design §3.1:
    # "Past a staleness threshold ... during market hours") — outside
    # market hours the last close is the expected, correct price, not a
    # stale one; yfinance's free-tier daily bars would otherwise always
    # read as "stale" purely because the clock has moved past a 5-minute
    # window meant for intraday polling.
    is_stale = state == MarketState.OPEN and (
        now - tick_time
    ).total_seconds() > settings.staleness_threshold_minutes * 60

    tick = PriceTick(
        symbol_id=symbol.id,
        source_code=DATA_SOURCE_CODE,
        price=quote.price,
        open=quote.open,
        volume=quote.volume,
        tick_time=tick_time,
        is_stale=is_stale,
    )
    db.add(tick)
    await db.commit()
    await db.refresh(tick)
    await _apply_pending_corporate_actions(db, symbol)

    # Write-through the latest-quote cache (plan §5) — best-effort, a Redis
    # outage never blocks ingestion; the API falls back to Postgres on a miss.
    try:
        await write_quote(
            get_redis_client(),
            symbol.id,
            {
                "price": float(tick.price),
                "open": float(tick.open) if tick.open is not None else None,
                "volume": tick.volume,
                "tick_time": tick.tick_time,
                "source": tick.source_code,
                "is_stale": tick.is_stale,
            },
        )
    except Exception:  # noqa: BLE001 — cache is never allowed to break ingestion
        logger.warning("quote cache write-through failed for %s", symbol.ticker, exc_info=True)

    logger.info(
        "%s: price=%.2f volume=%d state=%s stale=%s",
        symbol.ticker,
        quote.price,
        quote.volume,
        state.value,
        is_stale,
    )
    return tick


async def run_once(shard_index: int = 0, shard_count: int = 1) -> list[PriceTick]:
    """One full pass over active symbols. Shared by the single-shot script
    (Phase 3) and the scheduler (Phase 4). Delisted symbols are never
    polled — cheap enforcement of design §3.8 at the source."""
    from app.config import get_settings

    settings = get_settings()
    ticks: list[PriceTick] = []
    async with AsyncSessionLocal() as db:
        await _ensure_data_source(db)

        result = await db.execute(select(Symbol).where(Symbol.status == "active"))
        symbols = list(result.scalars().all())
        if shard_count > 1:
            symbols = [s for s in symbols if (hash(str(s.id)) % shard_count) == shard_index]

        exchanges = {e.code: e for e in (await db.execute(select(Exchange))).scalars().all()}

        for symbol in symbols:
            exchange = exchanges.get(symbol.exchange_code)
            if exchange is None:
                logger.warning(
                    "no exchange calendar for %s (%s), skipping", symbol.ticker, symbol.exchange_code
                )
                continue
            tick = await ingest_symbol(db, symbol, exchange, settings)
            if tick is not None:
                ticks.append(tick)
    return ticks
