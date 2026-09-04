"""Signal Engine main job (design §2.1 Signal Engine; plan §4). Runs as its
own scheduled process (`python -m workers.signal_engine`), reading
price_ticks + corporate_actions and writing symbol_baselines + change_events.
Never imported by the FastAPI app.
"""
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import CorporateAction, PriceTick, Symbol, SymbolBaseline
from app.db.session import AsyncSessionLocal
from workers.common.cache_invalidation import invalidate_digest_for_symbol
from workers.common.change_event_writer import upsert_change_event
from workers.ingestion.adjuster import CorporateActionLike, adjust_price
from workers.signal_engine.baseline import TickPoint, compute_baseline, is_building
from workers.signal_engine.classifiers import ClassifiedTick, classify_all, classify_source_conflict

logger = logging.getLogger("workers.signal_engine")


def _apply_adjustments(price: float, tick_date: date, actions: list[CorporateAction]) -> float:
    adjusted = price
    for action in actions:
        adjusted = adjust_price(
            adjusted,
            CorporateActionLike(
                action_type=action.action_type,
                ratio=float(action.ratio) if action.ratio is not None else None,
                amount=float(action.amount) if action.amount is not None else None,
                effective_date=action.effective_date,
            ),
            tick_date,
        )
    return adjusted


async def process_symbol(db: AsyncSession, symbol: Symbol, min_sample_size: int) -> int:
    """Returns the number of new change_events written for this symbol."""
    actions = list(
        (await db.execute(select(CorporateAction).where(CorporateAction.symbol_id == symbol.id)))
        .scalars()
        .all()
    )

    baseline_row = await db.get(SymbolBaseline, symbol.id)
    previous_computed_at = baseline_row.computed_at if baseline_row else None

    # Stale ticks are excluded from baseline + detection entirely (§3.1) —
    # a stale price can never trigger a false "shock".
    ticks = list(
        (
            await db.execute(
                select(PriceTick)
                .where(PriceTick.symbol_id == symbol.id, PriceTick.is_stale.is_(False))
                .order_by(PriceTick.tick_time)
            )
        )
        .scalars()
        .all()
    )
    if not ticks:
        return 0

    tick_points = [
        TickPoint(
            price=_apply_adjustments(float(t.price), t.tick_time.date(), actions),
            volume=t.volume,
            tick_date=t.tick_time.date(),
        )
        for t in ticks
    ]
    stats = compute_baseline(tick_points)
    now = datetime.now(timezone.utc)

    stmt = (
        pg_insert(SymbolBaseline)
        .values(
            symbol_id=symbol.id,
            avg_volume_20d=stats.avg_volume_20d,
            stddev_30d=stats.stddev_30d,
            ma_20d=stats.ma_20d,
            high_52w=stats.high_52w,
            low_52w=stats.low_52w,
            sample_size=stats.sample_size,
            computed_at=now,
        )
        .on_conflict_do_update(
            index_elements=["symbol_id"],
            set_={
                "avg_volume_20d": stats.avg_volume_20d,
                "stddev_30d": stats.stddev_30d,
                "ma_20d": stats.ma_20d,
                "high_52w": stats.high_52w,
                "low_52w": stats.low_52w,
                "sample_size": stats.sample_size,
                "computed_at": now,
            },
        )
    )
    await db.execute(stmt)
    await db.commit()

    if is_building(stats, min_sample_size):
        # "building baseline" — never fabricate a false signal (design §3.5)
        logger.info("%s: building baseline (sample_size=%d)", symbol.ticker, stats.sample_size)
        return 0

    # "New since last run" is measured on fetched_at (when *we* ingested the
    # row), not tick_time (the market's own timestamp for the data point) —
    # a freshly-ingested daily close legitimately carries yesterday's
    # tick_time, so tick_time can't tell us whether we've already seen it.
    # fetched_at is exactly "when the ingestion worker retrieved it" by
    # schema design, which is what "new" actually means here.
    new_indices = [
        i
        for i, t in enumerate(ticks)
        if previous_computed_at is None or t.fetched_at > previous_computed_at
    ]
    if not new_indices:
        return 0

    # Source-conflict check (design §3.3): group same-symbol ticks by exact
    # tick_time — if more than one source reported for the same market
    # timestamp and their prices diverge beyond tolerance, surface the
    # divergence itself as a data_quality_flag rather than silently picking
    # one. Grouped over ALL loaded ticks (not just the new ones) so a newly
    # arrived tick is compared against whatever else was reported for that
    # same instant, from any source.
    by_tick_time: dict[datetime, list[ClassifiedTick]] = {}
    for t, p in zip(ticks, tick_points):
        by_tick_time.setdefault(t.tick_time, []).append(
            ClassifiedTick(
                price=p.price,
                open=float(t.open) if t.open is not None else None,
                volume=t.volume,
                tick_time=t.tick_time,
                is_stale=t.is_stale,
            )
        )

    written = 0
    checked_conflict_groups: set[datetime] = set()
    for i in new_indices:
        raw_tick = ticks[i]
        point = tick_points[i]
        prev_tick = None
        if i > 0:
            prev_raw, prev_point = ticks[i - 1], tick_points[i - 1]
            prev_tick = ClassifiedTick(
                price=prev_point.price,
                open=float(prev_raw.open) if prev_raw.open is not None else None,
                volume=prev_raw.volume,
                tick_time=prev_raw.tick_time,
                is_stale=prev_raw.is_stale,
            )
        classified = ClassifiedTick(
            price=point.price,
            open=float(raw_tick.open) if raw_tick.open is not None else None,
            volume=raw_tick.volume,
            tick_time=raw_tick.tick_time,
            is_stale=raw_tick.is_stale,
        )
        candidates = list(classify_all(classified, stats, prev_tick))

        group = by_tick_time.get(raw_tick.tick_time, [])
        if raw_tick.tick_time not in checked_conflict_groups and len(group) > 1:
            checked_conflict_groups.add(raw_tick.tick_time)
            conflict = classify_source_conflict(group)
            if conflict is not None:
                candidates.append(conflict)

        for candidate in candidates:
            inserted = await upsert_change_event(
                db,
                symbol_id=symbol.id,
                event_type=candidate.event_type,
                event_time=candidate.event_time,
                severity=candidate.severity,
                score=candidate.score,
                details=candidate.details,
            )
            if inserted:
                written += 1
                logger.info(
                    "%s: %s (%s, score=%.1f)",
                    symbol.ticker,
                    candidate.event_type,
                    candidate.severity,
                    candidate.score,
                )
    if written > 0:
        # Proactive invalidation, not just TTL (plan §5) — a stale cached
        # digest must never keep showing an already-fired event as unseen.
        await invalidate_digest_for_symbol(symbol.id)
    return written


async def run_once() -> int:
    settings = get_settings()
    total_written = 0
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Symbol).where(Symbol.status == "active"))
        symbols = list(result.scalars().all())
        for symbol in symbols:
            total_written += await process_symbol(db, symbol, settings.baseline_min_sample_size)
    return total_written
