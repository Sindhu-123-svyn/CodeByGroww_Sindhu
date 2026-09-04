"""Pure rolling-stat computation: ticks -> BaselineStats (design §1.2/§2.1).
No DB/network access — exhaustively unit-testable (design §4).
"""
import statistics
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class TickPoint:
    """A corporate-action-adjusted price point, oldest-to-newest ordering
    assumed by the caller."""

    price: float
    volume: int
    tick_date: date


@dataclass(frozen=True)
class BaselineStats:
    avg_volume_20d: float | None
    stddev_30d: float | None
    ma_20d: float | None
    high_52w: float | None
    low_52w: float | None
    sample_size: int


def compute_baseline(ticks: list[TickPoint]) -> BaselineStats:
    """`ticks` should already be corporate-action-adjusted, with stale ticks
    excluded by the caller (design §3.1)."""
    sample_size = len(ticks)
    if sample_size == 0:
        return BaselineStats(None, None, None, None, None, 0)

    prices = [t.price for t in ticks]
    volumes = [t.volume for t in ticks]

    avg_volume_20d = statistics.fmean(volumes[-20:])
    ma_20d = statistics.fmean(prices[-20:])
    high_52w = max(prices)
    low_52w = min(prices)

    stddev_30d = None
    window = prices[-30:]
    if len(window) >= 2:
        stddev_30d = statistics.pstdev(window)

    return BaselineStats(
        avg_volume_20d=avg_volume_20d,
        stddev_30d=stddev_30d,
        ma_20d=ma_20d,
        high_52w=high_52w,
        low_52w=low_52w,
        sample_size=sample_size,
    )


def is_building(stats: BaselineStats, min_sample_size: int) -> bool:
    """A symbol just added has no rolling stats yet — the API must show
    "building baseline" rather than fabricate a false "no meaningful
    change" (design §3.5)."""
    return stats.sample_size < min_sample_size or stats.stddev_30d is None
