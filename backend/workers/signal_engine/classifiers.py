"""Pure classification functions: (tick, baseline, prev_tick) -> ChangeEvent
data | None — one per event type from design doc §1.3. No DB/network access;
the highest-leverage file for unit-test coverage (design §4, plan §9).
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from workers.signal_engine.baseline import BaselineStats

PRICE_SHOCK_Z_THRESHOLD = 2.0
VOLUME_ANOMALY_RATIO_THRESHOLD = 2.0
GAP_STDDEV_MULTIPLIER = 1.5
SOURCE_CONFLICT_TOLERANCE_PCT = 1.0


@dataclass(frozen=True)
class ClassifiedTick:
    price: float
    open: float | None
    volume: int
    tick_time: datetime
    is_stale: bool


@dataclass(frozen=True)
class EventCandidate:
    event_type: str
    event_time: datetime
    severity: str
    score: float
    details: dict[str, Any]


def classify_price_shock(
    tick: ClassifiedTick, baseline: BaselineStats, prev_close: float | None
) -> EventCandidate | None:
    """|Δprice| / rolling_30d_stddev > 2.0 (design §1.3) — z-score based,
    not a flat percentage, so it adjusts for each symbol's own volatility.
    Stale ticks never fire (design §3.1); no baseline stddev -> no signal.
    """
    if tick.is_stale or prev_close is None or not baseline.stddev_30d:
        return None
    delta = abs(tick.price - prev_close)
    z = delta / baseline.stddev_30d
    if z <= PRICE_SHOCK_Z_THRESHOLD:
        return None
    severity = "major" if z > 3.0 else "notable"
    score = round(min(10.0, z * 1.8), 1)
    return EventCandidate(
        event_type="price_shock",
        event_time=tick.tick_time,
        severity=severity,
        score=score,
        details={
            "z_score": round(z, 2),
            "delta": round(delta, 2),
            "reason": f"price moved {z:.1f} std-devs from previous close",
        },
    )


def classify_volume_anomaly(tick: ClassifiedTick, baseline: BaselineStats) -> EventCandidate | None:
    """volume > 2x avg_20d_volume (design §1.3)."""
    if tick.is_stale or not baseline.avg_volume_20d:
        return None
    ratio = tick.volume / baseline.avg_volume_20d
    if ratio <= VOLUME_ANOMALY_RATIO_THRESHOLD:
        return None
    severity = "major" if ratio > 4.0 else "notable"
    score = round(min(10.0, ratio * 2.4), 1)
    return EventCandidate(
        event_type="volume_anomaly",
        event_time=tick.tick_time,
        severity=severity,
        score=score,
        details={
            "volume": tick.volume,
            "avg_20d_volume": round(baseline.avg_volume_20d),
            "ratio": round(ratio, 2),
            "reason": f"volume {ratio:.1f}x the 20-day average",
        },
    )


def classify_trend_break(
    tick: ClassifiedTick, baseline: BaselineStats, prev_price: float | None
) -> EventCandidate | None:
    """Price crosses its 52-week high/low, or crosses its own 20-day moving
    average (design §1.3) — a structural signal, not noise."""
    if tick.is_stale:
        return None

    if baseline.high_52w is not None and tick.price > baseline.high_52w:
        return EventCandidate(
            event_type="trend_break",
            event_time=tick.tick_time,
            severity="notable",
            score=6.0,
            details={
                "crossed": "52w_high",
                "level": round(baseline.high_52w, 2),
                "reason": "price broke above its 52-week high",
            },
        )
    if baseline.low_52w is not None and tick.price < baseline.low_52w:
        return EventCandidate(
            event_type="trend_break",
            event_time=tick.tick_time,
            severity="notable",
            score=6.0,
            details={
                "crossed": "52w_low",
                "level": round(baseline.low_52w, 2),
                "reason": "price broke below its 52-week low",
            },
        )

    if baseline.ma_20d is not None and prev_price is not None:
        crossed_up = prev_price <= baseline.ma_20d < tick.price
        crossed_down = prev_price >= baseline.ma_20d > tick.price
        if crossed_up or crossed_down:
            direction = "up" if crossed_up else "down"
            return EventCandidate(
                event_type="trend_break",
                event_time=tick.tick_time,
                severity="minor",
                score=2.5,
                details={
                    "crossed": "20d_ma",
                    "direction": direction,
                    "reason": f"price crossed {direction} through its 20-day moving average",
                },
            )
    return None


def classify_gap_event(
    tick: ClassifiedTick, baseline: BaselineStats, prev_close: float | None
) -> EventCandidate | None:
    """|open_today - prev_close| > 1.5x rolling stddev (design §1.3) —
    captures overnight/pre-market moves a user would otherwise miss
    entirely between visits."""
    if tick.is_stale or tick.open is None or prev_close is None or not baseline.stddev_30d:
        return None
    gap = abs(tick.open - prev_close)
    threshold = GAP_STDDEV_MULTIPLIER * baseline.stddev_30d
    if gap <= threshold:
        return None
    gap_pct = round((gap / prev_close) * 100, 2) if prev_close else None
    severity = "major" if gap > 2 * threshold else "notable"
    score = round(min(10.0, (gap / baseline.stddev_30d) * 1.5), 1)
    return EventCandidate(
        event_type="gap_event",
        event_time=tick.tick_time,
        severity=severity,
        score=score,
        details={
            "open": tick.open,
            "prev_close": prev_close,
            "gap_pct": gap_pct,
            "reason": "overnight/pre-market gap beyond normal volatility",
        },
    )


def classify_source_conflict(
    ticks_same_window: list[ClassifiedTick], tolerance_pct: float = SOURCE_CONFLICT_TOLERANCE_PCT
) -> EventCandidate | None:
    """Compares near-simultaneous ticks from different sources; if prices
    diverge beyond `tolerance_pct`, surfaces the divergence itself rather
    than silently picking one (design §3.3)."""
    if len(ticks_same_window) < 2:
        return None
    prices = [t.price for t in ticks_same_window]
    if min(prices) == 0:
        return None
    spread_pct = (max(prices) - min(prices)) / min(prices) * 100
    if spread_pct <= tolerance_pct:
        return None
    latest = max(ticks_same_window, key=lambda t: t.tick_time)
    return EventCandidate(
        event_type="data_quality_flag",
        event_time=latest.tick_time,
        severity="major",
        score=8.0,
        details={
            "reason": "data sources disagree beyond tolerance",
            "spread_pct": round(spread_pct, 2),
            "prices": prices,
        },
    )


def classify_all(
    tick: ClassifiedTick, baseline: BaselineStats, prev_tick: ClassifiedTick | None
) -> list[EventCandidate]:
    """Runs every per-tick classifier and returns every event that fired —
    a single tick can be both a price_shock and a volume_anomaly at once
    (plan §9 multi-trigger test case)."""
    prev_close = prev_tick.price if prev_tick else None
    candidates = [
        classify_price_shock(tick, baseline, prev_close),
        classify_volume_anomaly(tick, baseline),
        classify_trend_break(tick, baseline, prev_close),
        classify_gap_event(tick, baseline, prev_close),
    ]
    return [c for c in candidates if c is not None]
