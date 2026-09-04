import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.symbol import LatestQuoteOut, SymbolOut


class WatchlistCreate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)


class WatchlistUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class WatchlistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class WatchlistListOut(WatchlistOut):
    item_count: int


class WatchlistItemCreate(BaseModel):
    symbol_id: uuid.UUID


class WatchlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    symbol: SymbolOut
    position: int
    last_viewed_at: datetime | None
    added_at: datetime
    # Only populated by GET /watchlists/{id}/items (plan: watchlist rows
    # showing live price + day change) — absent (None) on responses built
    # from a bare WatchlistItem ORM row, e.g. add/reorder/acknowledge,
    # which don't look it up since the frontend refetches the list anyway.
    latest_quote: LatestQuoteOut | None = None


class ReorderRequest(BaseModel):
    ordered_item_ids: list[uuid.UUID] = Field(min_length=1)


class AcknowledgeRequest(BaseModel):
    as_of: datetime | None = None
