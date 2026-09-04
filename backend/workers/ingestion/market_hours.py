"""Market-hours-aware classification per exchange (design §3.4). Pure
functions — no DB/network access."""
from datetime import datetime, time, timedelta
from enum import Enum
from zoneinfo import ZoneInfo


class MarketState(str, Enum):
    OPEN = "open"
    PRE_POST = "pre_post_market"
    CLOSED = "closed"


def classify(now_utc: datetime, timezone: str, open_time: time, close_time: time) -> MarketState:
    local = now_utc.astimezone(ZoneInfo(timezone))
    if local.weekday() >= 5:  # Saturday/Sunday
        return MarketState.CLOSED

    t = local.time()
    if open_time <= t <= close_time:
        return MarketState.OPEN

    pre_start = (datetime.combine(local.date(), open_time) - timedelta(hours=2)).time()
    post_end = (datetime.combine(local.date(), close_time) + timedelta(hours=2)).time()
    if pre_start <= t < open_time or close_time < t <= post_end:
        return MarketState.PRE_POST
    return MarketState.CLOSED


def interval_seconds(state: MarketState, open_seconds: int, offhours_seconds: int) -> int:
    """Poll frequency adapts to market hours (README §3.3)."""
    if state == MarketState.OPEN:
        return open_seconds
    if state == MarketState.PRE_POST:
        return max(open_seconds * 10, 300)  # a middle cadence between open and closed
    return offhours_seconds
