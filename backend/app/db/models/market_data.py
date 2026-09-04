import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, BigInteger, Enum, ForeignKey, Index, Numeric, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import TIMESTAMP, Date

from app.db.base import Base

corporate_action_type_enum = Enum(
    "split", "dividend", name="corporate_action_type", create_type=False
)


class PriceTick(Base):
    """Mirrors `price_ticks`. Append-only in the DB (trigger
    block_price_tick_mutation forbids UPDATE/DELETE, design §2.2) — the ORM
    layer must never attempt to mutate a row here; only INSERT.
    `is_stale` is set by the Ingestion Worker and read by the Signal Engine
    to exclude untrustworthy ticks from detection (design §3.1).
    """

    __tablename__ = "price_ticks"
    __table_args__ = (Index("idx_price_ticks_symbol_time", "symbol_id", text("tick_time DESC")),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symbols.id"), nullable=False
    )
    source_code: Mapped[str] = mapped_column(Text, ForeignKey("data_sources.code"), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(18, 6), nullable=False)
    open: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tick_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    is_stale: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))


class CorporateAction(Base):
    """Mirrors `corporate_actions`. Applied at read time by the Signal
    Engine's baseline math, never by mutating price_ticks (design §3.6).
    `applied_at` is set by the Ingestion Worker once accounted for.
    """

    __tablename__ = "corporate_actions"
    __table_args__ = (Index("idx_corporate_actions_symbol", "symbol_id", "effective_date"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symbols.id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(corporate_action_type_enum, nullable=False)
    ratio: Mapped[float | None] = mapped_column(Numeric(10, 6), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    applied_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
