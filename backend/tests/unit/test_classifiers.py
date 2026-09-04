"""Exhaustive synthetic-data tests for the classification pure functions
(design §4). No DB/network — every case here should run in milliseconds.
"""
from datetime import datetime, timezone

from workers.signal_engine.baseline import BaselineStats
from workers.signal_engine.classifiers import (
    ClassifiedTick,
    classify_all,
    classify_gap_event,
    classify_price_shock,
    classify_source_conflict,
    classify_trend_break,
    classify_volume_anomaly,
)

NOW = datetime(2026, 1, 15, tzinfo=timezone.utc)

READY_BASELINE = BaselineStats(
    avg_volume_20d=1_000_000,
    stddev_30d=2.0,
    ma_20d=100.0,
    high_52w=120.0,
    low_52w=80.0,
    sample_size=30,
)


def tick(price, open_=None, volume=1_000_000, is_stale=False) -> ClassifiedTick:
    return ClassifiedTick(price=price, open=open_, volume=volume, tick_time=NOW, is_stale=is_stale)


# --- price_shock -------------------------------------------------------


def test_price_shock_exactly_at_threshold_does_not_fire():
    # delta=4.0, stddev=2.0 -> z=2.0, threshold is "> 2.0" (strict)
    assert classify_price_shock(tick(104.0), READY_BASELINE, 100.0) is None


def test_price_shock_just_past_threshold_fires_notable():
    result = classify_price_shock(tick(104.2), READY_BASELINE, 100.0)
    assert result is not None
    assert result.severity == "notable"
    assert result.details["z_score"] == 2.1


def test_price_shock_far_past_threshold_fires_major():
    result = classify_price_shock(tick(120.0), READY_BASELINE, 100.0)
    assert result is not None
    assert result.severity == "major"


def test_price_shock_stale_tick_never_fires():
    assert classify_price_shock(tick(150.0, is_stale=True), READY_BASELINE, 100.0) is None


def test_price_shock_no_baseline_stddev_never_fires():
    building = BaselineStats(None, None, None, None, None, sample_size=3)
    assert classify_price_shock(tick(150.0), building, 100.0) is None


def test_price_shock_no_prev_close_never_fires():
    assert classify_price_shock(tick(150.0), READY_BASELINE, None) is None


# --- volume_anomaly ------------------------------------------------------


def test_volume_anomaly_exactly_at_threshold_does_not_fire():
    assert classify_volume_anomaly(tick(100.0, volume=2_000_000), READY_BASELINE) is None


def test_volume_anomaly_just_past_threshold_fires():
    result = classify_volume_anomaly(tick(100.0, volume=2_100_000), READY_BASELINE)
    assert result is not None
    assert result.event_type == "volume_anomaly"


def test_volume_anomaly_far_past_threshold_fires_major():
    result = classify_volume_anomaly(tick(100.0, volume=5_000_000), READY_BASELINE)
    assert result.severity == "major"


def test_volume_anomaly_stale_tick_never_fires():
    assert classify_volume_anomaly(tick(100.0, volume=9_000_000, is_stale=True), READY_BASELINE) is None


# --- trend_break -----------------------------------------------------------


def test_trend_break_52w_high_break_fires():
    result = classify_trend_break(tick(121.0), READY_BASELINE, 115.0)
    assert result is not None
    assert result.details["crossed"] == "52w_high"


def test_trend_break_52w_low_break_fires():
    result = classify_trend_break(tick(79.0), READY_BASELINE, 85.0)
    assert result.details["crossed"] == "52w_low"


def test_trend_break_20d_ma_cross_up_fires_minor():
    # prev price below MA (100), new price above it
    result = classify_trend_break(tick(101.0), READY_BASELINE, 99.0)
    assert result.severity == "minor"
    assert result.details["direction"] == "up"


def test_trend_break_no_cross_does_not_fire():
    assert classify_trend_break(tick(101.0), READY_BASELINE, 102.0) is None


def test_trend_break_stale_tick_never_fires():
    assert classify_trend_break(tick(200.0, is_stale=True), READY_BASELINE, 100.0) is None


# --- gap_event ---------------------------------------------------------


def test_gap_event_exactly_at_threshold_does_not_fire():
    # threshold = 1.5 * stddev(2.0) = 3.0
    assert classify_gap_event(tick(100.0, open_=103.0), READY_BASELINE, 100.0) is None


def test_gap_event_just_past_threshold_fires():
    result = classify_gap_event(tick(100.0, open_=103.2), READY_BASELINE, 100.0)
    assert result is not None
    assert result.event_type == "gap_event"


def test_gap_event_no_open_never_fires():
    assert classify_gap_event(tick(100.0, open_=None), READY_BASELINE, 100.0) is None


def test_gap_event_stale_tick_never_fires():
    assert classify_gap_event(tick(100.0, open_=110.0, is_stale=True), READY_BASELINE, 100.0) is None


# --- source_conflict -----------------------------------------------------


def test_source_conflict_within_tolerance_does_not_fire():
    a = tick(100.0)
    b = tick(100.5)
    assert classify_source_conflict([a, b], tolerance_pct=1.0) is None


def test_source_conflict_beyond_tolerance_fires():
    a = tick(100.0)
    b = tick(105.0)
    result = classify_source_conflict([a, b], tolerance_pct=1.0)
    assert result is not None
    assert result.event_type == "data_quality_flag"


def test_source_conflict_single_tick_never_fires():
    assert classify_source_conflict([tick(100.0)]) is None


# --- classify_all: multi-trigger + building-baseline safety ----------------


def test_classify_all_multi_trigger_tick_fires_both():
    """A single tick can be both a price_shock and a volume_anomaly at once
    (plan §9)."""
    t = tick(120.0, open_=100.5, volume=5_000_000)
    results = classify_all(t, READY_BASELINE, ClassifiedTick(100.0, 100.0, 1_000_000, NOW, False))
    types = {r.event_type for r in results}
    assert "price_shock" in types
    assert "volume_anomaly" in types


def test_classify_all_stale_tick_produces_nothing():
    t = tick(500.0, open_=500.0, volume=99_000_000, is_stale=True)
    results = classify_all(t, READY_BASELINE, ClassifiedTick(100.0, 100.0, 1_000_000, NOW, False))
    assert results == []


def test_classify_all_no_prev_tick_still_handles_volume_and_trend():
    """No previous tick (e.g. the very first ever ingested) -> price_shock
    and gap_event can't evaluate (need prev_close) but volume_anomaly and
    52w trend breaks still can."""
    t = tick(200.0, open_=200.0, volume=9_000_000)
    results = classify_all(t, READY_BASELINE, None)
    types = {r.event_type for r in results}
    assert "price_shock" not in types
    assert "gap_event" not in types
    assert "volume_anomaly" in types
    assert "trend_break" in types
