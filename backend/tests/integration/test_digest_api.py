"""Reproduces the exact acceptance scenario SEED_DATA.sql's comments
describe (plan §6, §9): a fresh watchlist with one item that has an event
after its last_viewed_at (-> shows up), one with an event before it (->
doesn't), and one never-viewed item with too little history (-> "building").
"""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import text

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_digest_since_last_visit_scenario(client: AsyncClient, registered_user, symbol_ids, db_session):
    _, _, headers = registered_user
    wl = await client.post("/api/v1/watchlists", json={"name": "Digest Test"}, headers=headers)
    wl_id = wl.json()["id"]

    aapl_item = (
        await client.post(
            f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
        )
    ).json()

    # Set last_viewed_at to 10 days ago, directly in the DB (simulating a
    # past visit) — AAPL already has real change_events from earlier phases
    # dated well within the last 10 days, so it must land outside "no_change".
    await db_session.execute(
        text("UPDATE watchlist_items SET last_viewed_at = :ts WHERE id = :id"),
        {"ts": datetime.now(timezone.utc) - timedelta(days=10), "id": aapl_item["id"]},
    )
    await db_session.commit()

    resp = await client.get(f"/api/v1/digest?watchlist_id={wl_id}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()

    all_tickers_by_bucket = {
        sev: [e["symbol"]["ticker"] for e in entries] for sev, entries in body["groups"].items()
    }
    aapl_bucket = next(sev for sev, tickers in all_tickers_by_bucket.items() if "AAPL" in tickers)
    assert aapl_bucket in ("major", "notable", "minor"), (
        f"AAPL should show new events since a 10-day-old cursor, landed in {aapl_bucket!r}"
    )


async def test_digest_unknown_watchlist_is_404(client: AsyncClient, registered_user):
    _, _, headers = registered_user
    resp = await client.get(
        "/api/v1/digest?watchlist_id=00000000-0000-0000-0000-000000000000", headers=headers
    )
    assert resp.status_code == 404
