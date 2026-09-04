"""Market-hours-aware scheduling loop for the Ingestion Worker (design §3.4;
plan §3 item 2). Runs a fixed short base tick, but only actually fetches a
given symbol once enough time has passed for its exchange's current-state
interval — avoiding a message-queue/cron-per-symbol architecture for v1
(design §4 "no premature complexity").
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import get_settings
from app.db.models import Exchange, Symbol
from app.db.session import AsyncSessionLocal
from workers.common.change_event_writer import upsert_change_event
from workers.ingestion.ingest_job import _ensure_data_source, ingest_symbol
from workers.ingestion.market_hours import MarketState, classify, interval_seconds

logger = logging.getLogger("workers.ingestion.scheduler")

BASE_TICK_SECONDS = 10
GAP_MULTIPLIER = 2  # write a data_quality_flag if silent > 2x the expected interval


async def run_forever(shard_index: int = 0, shard_count: int = 1) -> None:
    settings = get_settings()
    last_fetch: dict[str, datetime] = {}

    # Was previously only called from the one-shot script's run_once() —
    # the scheduler (this function, what `python -m workers.ingestion`
    # actually runs) never ensured the 'yfinance' data_sources row existed,
    # so a fresh deployment where the scheduler is the *first* thing to
    # touch price_ticks hit a foreign-key violation on its very first
    # insert. Caught running this worker standalone in Docker.
    async with AsyncSessionLocal() as db:
        await _ensure_data_source(db)

    while True:
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Symbol).where(Symbol.status == "active"))
            symbols = list(result.scalars().all())
            if shard_count > 1:
                symbols = [s for s in symbols if (hash(str(s.id)) % shard_count) == shard_index]
            exchanges = {e.code: e for e in (await db.execute(select(Exchange))).scalars().all()}

            for symbol in symbols:
                exchange = exchanges.get(symbol.exchange_code)
                if exchange is None:
                    continue

                state = classify(now, exchange.timezone, exchange.open_time, exchange.close_time)
                interval = interval_seconds(
                    state,
                    settings.ingestion_interval_open_seconds,
                    settings.ingestion_interval_offhours_seconds,
                )
                prev = last_fetch.get(symbol.ticker)

                # Missing-tick / gap detection (design §3.2): a symbol
                # silent for 2x its expected interval during market hours
                # gets a data_quality_flag — an ingestion-trust signal, not
                # a market signal, so it doesn't need a baseline.
                if prev is not None and state == MarketState.OPEN:
                    silent_for = (now - prev).total_seconds()
                    if silent_for > interval * GAP_MULTIPLIER:
                        await upsert_change_event(
                            db,
                            symbol_id=symbol.id,
                            event_type="data_quality_flag",
                            event_time=now,
                            severity="major",
                            score=7.0,
                            details={
                                "reason": "expected tick not received",
                                "gap_minutes": round(silent_for / 60, 1),
                            },
                        )

                if prev is None or (now - prev).total_seconds() >= interval:
                    tick = await ingest_symbol(db, symbol, exchange, settings)
                    if tick is not None:
                        last_fetch[symbol.ticker] = now

        await asyncio.sleep(BASE_TICK_SECONDS)
