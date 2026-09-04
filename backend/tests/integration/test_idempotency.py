"""Idempotent change_event insert (design §2.2, plan §9): writing the same
(symbol_id, event_type, event_time) key twice must produce exactly one row.
"""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.db.models import ChangeEvent
from workers.common.change_event_writer import upsert_change_event

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_duplicate_change_event_key_is_a_noop(db_session, symbol_ids):
    symbol_id = uuid.UUID(symbol_ids["MSFT"])
    event_time = datetime.now(timezone.utc)

    first = await upsert_change_event(
        db_session,
        symbol_id=symbol_id,
        event_type="trend_break",
        event_time=event_time,
        severity="minor",
        score=1.0,
        details={"reason": "test idempotency"},
    )
    second = await upsert_change_event(
        db_session,
        symbol_id=symbol_id,
        event_type="trend_break",
        event_time=event_time,
        severity="minor",
        score=1.0,
        details={"reason": "test idempotency"},
    )

    assert first is True
    assert second is False

    result = await db_session.execute(
        select(ChangeEvent).where(
            ChangeEvent.symbol_id == symbol_id,
            ChangeEvent.event_type == "trend_break",
            ChangeEvent.event_time == event_time,
        )
    )
    rows = result.scalars().all()
    assert len(rows) == 1
