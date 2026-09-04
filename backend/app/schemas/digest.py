import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.symbol import LatestQuoteOut, SymbolOut


class EventOut(BaseModel):
    event_type: str
    severity: str
    score: float
    event_time: datetime
    why: str
    details: dict[str, Any]


class DigestEntry(BaseModel):
    watchlist_item_id: uuid.UUID
    symbol: SymbolOut
    last_viewed_at: datetime | None
    latest_quote: LatestQuoteOut | None
    baseline_status: str  # "ready" | "building" (design §3.5)
    events_since_last_view: list[EventOut]
    attention_score: float


class DigestOut(BaseModel):
    generated_at: datetime
    groups: dict[str, list[DigestEntry]]
