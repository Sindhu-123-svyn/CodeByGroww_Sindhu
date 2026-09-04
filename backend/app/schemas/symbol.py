import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SymbolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticker: str
    exchange_code: str
    name: str
    status: str


class LatestQuoteOut(BaseModel):
    price: float
    # Today's opening print for this symbol, when the ingested tick carried
    # one — powers a cheap day % change (price vs open) without an extra
    # query. None for older/back-filled ticks that predate this field.
    open: float | None = None
    volume: int
    tick_time: datetime
    source: str
    is_stale: bool


class PriceHistoryPoint(BaseModel):
    tick_time: datetime
    price: float
    volume: int
    source: str
    is_stale: bool


class BaselineOut(BaseModel):
    avg_volume_20d: float | None
    stddev_30d: float | None
    ma_20d: float | None
    high_52w: float | None
    low_52w: float | None
    sample_size: int
    status: str  # "ready" | "building" (design §3.5)


class CorporateActionOut(BaseModel):
    action_type: str
    ratio: float | None
    amount: float | None
    effective_date: date
    applied_at: datetime | None


class RecentEventOut(BaseModel):
    event_type: str
    severity: str
    score: float
    event_time: datetime
    why: str


class SymbolDetailOut(BaseModel):
    symbol: SymbolOut
    latest_quote: LatestQuoteOut | None
    baseline: BaselineOut
    price_history: list[PriceHistoryPoint]
    recent_events: list[RecentEventOut]
    corporate_actions: list[CorporateActionOut]
    news: list[Any] = []  # stubbed empty — not in current scope (plan §2.5)
