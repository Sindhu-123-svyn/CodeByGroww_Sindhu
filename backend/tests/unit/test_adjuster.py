"""Corporate-action adjustment math (design §4, §3.6)."""
from datetime import date

import pytest

from workers.ingestion.adjuster import CorporateActionLike, adjust_price, adjustment_factor

SPLIT_DATE = date(2026, 6, 1)


def test_split_factor_is_inverse_of_ratio():
    action = CorporateActionLike("split", ratio=2.0, amount=None, effective_date=SPLIT_DATE)
    assert adjustment_factor(action) == 0.5


def test_split_missing_ratio_raises():
    action = CorporateActionLike("split", ratio=None, amount=None, effective_date=SPLIT_DATE)
    with pytest.raises(ValueError):
        adjustment_factor(action)


def test_dividend_factor_is_noop():
    action = CorporateActionLike("dividend", ratio=None, amount=1.5, effective_date=SPLIT_DATE)
    assert adjustment_factor(action) == 1.0


def test_unknown_action_type_raises():
    action = CorporateActionLike("merger", ratio=None, amount=None, effective_date=SPLIT_DATE)
    with pytest.raises(ValueError):
        adjustment_factor(action)


def test_price_before_split_is_adjusted_down():
    action = CorporateActionLike("split", ratio=3.0, amount=None, effective_date=SPLIT_DATE)
    pre_split_price = 300.0
    tick_date = date(2026, 5, 1)  # before the split
    assert adjust_price(pre_split_price, action, tick_date) == pytest.approx(100.0)


def test_price_on_or_after_split_is_unchanged():
    action = CorporateActionLike("split", ratio=3.0, amount=None, effective_date=SPLIT_DATE)
    assert adjust_price(100.0, action, SPLIT_DATE) == 100.0
    assert adjust_price(100.0, action, date(2026, 7, 1)) == 100.0


def test_price_unaffected_by_dividend_action():
    action = CorporateActionLike("dividend", ratio=None, amount=2.0, effective_date=SPLIT_DATE)
    tick_date = date(2026, 5, 1)
    assert adjust_price(100.0, action, tick_date) == 100.0
