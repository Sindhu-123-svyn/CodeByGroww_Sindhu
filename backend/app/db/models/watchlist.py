import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.sqltypes import TIMESTAMP

from app.db.base import Base
from app.db.models.reference import Symbol


class Watchlist(Base):
    """Mirrors `watchlists`. Persisted server-side so it's consistent across
    devices/sessions (README §3.3), not local storage.
    """

    __tablename__ = "watchlists"
    __table_args__ = (Index("idx_watchlists_user", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'My Watchlist'"))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )


class WatchlistItem(Base):
    """Mirrors `watchlist_items`. `last_viewed_at` is the per-item cursor the
    whole "since last visit" product is anchored to (design §1.4) — it only
    ever advances, enforced by the DB trigger enforce_last_viewed_at_forward
    (design §3.7 race-condition rule), never by application code.
    """

    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("watchlist_id", "symbol_id"),
        Index("idx_watchlist_items_watchlist", "watchlist_id"),
        Index("idx_watchlist_items_symbol", "symbol_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    watchlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("watchlists.id", ondelete="CASCADE"), nullable=False
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symbols.id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    last_viewed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    added_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )

    # Read-only convenience relationship (adds no schema change — verified
    # empty against Alembic autogenerate). joined = one query per fetch,
    # no N+1 when listing a watchlist's items.
    symbol: Mapped[Symbol] = relationship(Symbol, lazy="joined", viewonly=True)
