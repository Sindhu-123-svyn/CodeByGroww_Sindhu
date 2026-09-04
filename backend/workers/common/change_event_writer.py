"""Shared idempotent ChangeEvent upsert used by both the Ingestion Worker
(data_quality_flag events tied to ingestion trust, design §3.2) and the
Signal Engine (all 5 event types, design §2.2). Relies entirely on the
schema's UNIQUE(symbol_id, event_type, event_time) — no separate "have I
already processed this" bookkeeping needed.
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ChangeEvent


async def upsert_change_event(
    db: AsyncSession,
    *,
    symbol_id: uuid.UUID,
    event_type: str,
    event_time: datetime,
    severity: str,
    score: float,
    details: dict[str, Any],
) -> bool:
    """Returns True if a new row was inserted, False if the idempotency key
    already existed (ON CONFLICT DO NOTHING)."""
    stmt = (
        pg_insert(ChangeEvent)
        .values(
            symbol_id=symbol_id,
            event_type=event_type,
            event_time=event_time,
            severity=severity,
            score=score,
            details=details,
        )
        .on_conflict_do_nothing(index_elements=["symbol_id", "event_type", "event_time"])
        .returning(ChangeEvent.id)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.first() is not None
