"""Corporate-action adjustment — a pure function, unit-testable in
isolation. Applied at *read time* by the Signal Engine's baseline math;
price_ticks is append-only and is never rewritten (design §3.6).
"""
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class CorporateActionLike:
    action_type: str  # "split" | "dividend"
    ratio: float | None
    amount: float | None
    effective_date: date


def adjustment_factor(action: CorporateActionLike) -> float:
    """Multiplicative factor applied to prices *before* the action's
    effective_date. A 2-for-1 split means pre-split prices must be divided
    by 2 (factor 0.5) to stay comparable to post-split prices.

    v1 scope: dividends are tracked (schema + ingestion mark them applied)
    but do not adjust price — a real dividend adjustment needs the
    ex-dividend closing price, which isn't captured by this schema's
    `amount` alone; documented here rather than silently guessed at.
    """
    if action.action_type == "split":
        if not action.ratio or action.ratio <= 0:
            raise ValueError(f"split action missing a valid ratio: {action}")
        return 1.0 / action.ratio
    if action.action_type == "dividend":
        return 1.0
    raise ValueError(f"unknown corporate action type: {action.action_type}")


def adjust_price(raw_price: float, action: CorporateActionLike, tick_date: date) -> float:
    """Applies the factor only when tick_date predates the action — i.e.
    this is a historical pre-action price being compared against
    post-action baselines."""
    if tick_date >= action.effective_date:
        return raw_price
    return raw_price * adjustment_factor(action)
