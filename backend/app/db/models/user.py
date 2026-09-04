import uuid
from datetime import datetime

from sqlalchemy import Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import TIMESTAMP

from app.db.base import Base


class User(Base):
    """Mirrors DATABASE_SCHEMA.sql `users`.

    Minimal auth only (README §6) — email + password_hash, no OAuth/session
    table. max_watchlist_items backs the per-user rate limit enforced by the
    DB trigger enforce_watchlist_item_limit (design §3.8).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    max_watchlist_items: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("100"))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
