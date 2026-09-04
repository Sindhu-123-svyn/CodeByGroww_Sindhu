"""Rolling-stat computation correctness (design §4)."""
import statistics
from datetime import date, timedelta

from workers.signal_engine.baseline import TickPoint, compute_baseline, is_building

START = date(2026, 1, 1)


def make_ticks(prices: list[float], volumes: list[int] | None = None) -> list[TickPoint]:
    volumes = volumes or [1_000_000] * len(prices)
    return [
        TickPoint(price=p, volume=v, tick_date=START + timedelta(days=i))
        for i, (p, v) in enumerate(zip(prices, volumes))
    ]


def test_empty_ticks_returns_zero_sample_size():
    stats = compute_baseline([])
    assert stats.sample_size == 0
    assert stats.stddev_30d is None


def test_high_low_52w_are_min_max_of_full_series():
    ticks = make_ticks([100, 150, 90, 120])
    stats = compute_baseline(ticks)
    assert stats.high_52w == 150
    assert stats.low_52w == 90


def test_ma_20d_uses_last_20_only():
    prices = list(range(1, 26))  # 25 days, 1..25
    ticks = make_ticks([float(p) for p in prices])
    stats = compute_baseline(ticks)
    expected = statistics.fmean(prices[-20:])
    assert stats.ma_20d == expected


def test_avg_volume_20d_uses_last_20_only():
    prices = [100.0] * 25
    volumes = list(range(1, 26))
    ticks = make_ticks(prices, volumes)
    stats = compute_baseline(ticks)
    expected = statistics.fmean(volumes[-20:])
    assert stats.avg_volume_20d == expected


def test_stddev_none_below_two_samples():
    ticks = make_ticks([100.0])
    stats = compute_baseline(ticks)
    assert stats.stddev_30d is None


def test_stddev_uses_last_30_only():
    prices = [100.0] * 40 + [200.0]  # last 30 = 29x100 + 1x200
    ticks = make_ticks(prices)
    stats = compute_baseline(ticks)
    expected = statistics.pstdev(prices[-30:])
    assert stats.stddev_30d == expected


def test_is_building_true_below_min_sample_size():
    stats = compute_baseline(make_ticks([100.0, 101.0, 102.0]))
    assert is_building(stats, min_sample_size=10) is True


def test_is_building_false_at_min_sample_size_with_stddev():
    ticks = make_ticks([100.0 + i for i in range(10)])
    stats = compute_baseline(ticks)
    assert stats.sample_size == 10
    assert is_building(stats, min_sample_size=10) is False


def test_is_building_true_when_stddev_none_even_with_enough_samples():
    # Pathological but shouldn't happen in practice given sample_size>=2
    # implies stddev is computed; guards the "never fabricate a signal"
    # rule regardless (design §3.5).
    stats = compute_baseline(make_ticks([100.0]))
    assert is_building(stats, min_sample_size=1) is True
