import uuid
from datetime import datetime, time

from sqlalchemy import Enum, ForeignKey, SmallInteger, Text, Time, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import TIMESTAMP

from app.db.base import Base

# Mirrors `CREATE TYPE symbol_status` in DATABASE_SCHEMA.sql. create_type=False
# is essential: the enum already exists in Postgres, SQLAlchemy must never
# try to (re)create it.
symbol_status_enum = Enum(
    "active", "delisted", "suspended", name="symbol_status", create_type=False
)


class Exchange(Base):
    """Mirrors `exchanges` — market-hours calendars for gap/off-hours
    detection (design §3.4) and for the Ingestion Worker's polling cadence.
    """

    __tablename__ = "exchanges"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False)
    open_time: Mapped[time] = mapped_column(Time, nullable=False)
    close_time: Mapped[time] = mapped_column(Time, nullable=False)


class Symbol(Base):
    """Mirrors `symbols`. status='delisted' is enforced against watchlist
    adds by the DB trigger validate_symbol_active (design §3.8) — the
    service layer should catch that IntegrityError, not re-implement the
    check as the source of truth.
    """

    __tablename__ = "symbols"
    __table_args__ = (UniqueConstraint("ticker", "exchange_code"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    exchange_code: Mapped[str] = mapped_column(Text, ForeignKey("exchanges.code"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(symbol_status_enum, nullable=False, server_default=text("'active'"))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )


class DataSource(Base):
    """Mirrors `data_sources` — trust ranking used to resolve conflicting
    sources without silently picking one (design §3.3).
    """

    __tablename__ = "data_sources"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    trust_priority: Mapped[int] = mapped_column(SmallInteger, nullable=False)
