import uuid
from datetime import datetime

from sqlalchemy import Enum, ForeignKey, Index, Integer, Numeric, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import TIMESTAMP

from app.db.base import Base

change_event_type_enum = Enum(
    "price_shock",
    "volume_anomaly",
    "trend_break",
    "gap_event",
    "data_quality_flag",
    name="change_event_type",
    create_type=False,
)

change_severity_enum = Enum(
    "major", "notable", "minor", "no_change", name="change_severity", create_type=False
)


class SymbolBaseline(Base):
    """Mirrors `symbol_baselines`. sample_size < BASELINE_MIN_SAMPLE_SIZE
    means "building baseline" (design §3.5) — the API must render that
    state explicitly, never fabricate a false "no meaningful change".
    """

    __tablename__ = "symbol_baselines"

    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symbols.id"), primary_key=True
    )
    avg_volume_20d: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    stddev_30d: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    ma_20d: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    high_52w: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    low_52w: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    computed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )


class ChangeEvent(Base):
    """Mirrors `change_events` — the object the UI actually renders.
    UNIQUE(symbol_id, event_type, event_time) is the idempotency key a
    crashed/re-run detection job relies on (design §2.2); the ORM layer
    should upsert with ON CONFLICT DO NOTHING, never its own dedup logic.
    """

    __tablename__ = "change_events"
    __table_args__ = (
        UniqueConstraint("symbol_id", "event_type", "event_time"),
        Index("idx_change_events_symbol_time", "symbol_id", text("event_time DESC")),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    symbol_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symbols.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(change_event_type_enum, nullable=False)
    event_time: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    severity: Mapped[str] = mapped_column(change_severity_enum, nullable=False)
    score: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
