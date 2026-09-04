"""Asserts the DB-trigger-to-4xx translation end-to-end (plan §9 — "the most
important resilience test here") plus the rate limit and forward-only
last_viewed_at guarantees.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import text

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_add_active_delisted_unknown_symbol(client: AsyncClient, registered_user, symbol_ids):
    _, _, headers = registered_user
    wl = await client.post("/api/v1/watchlists", json={"name": "T"}, headers=headers)
    wl_id = wl.json()["id"]

    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
    )
    assert resp.status_code == 201

    # Duplicate -> 409
    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
    )
    assert resp.status_code == 409

    # Delisted -> 409, via the validate_symbol_active trigger's RAISE
    # EXCEPTION translated to a clean 4xx
    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["SIVB"]}, headers=headers
    )
    assert resp.status_code == 409

    # Unknown id -> 404
    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": "00000000-0000-0000-0000-000000000000"}, headers=headers
    )
    assert resp.status_code == 404


async def test_watchlist_item_rate_limit(client: AsyncClient, registered_user, symbol_ids, db_session):
    email, _, headers = registered_user
    # Lower this fresh user's limit to 1 (design §3.8 — trigger
    # enforce_watchlist_item_limit is the source of truth).
    await db_session.execute(
        text("UPDATE users SET max_watchlist_items = 1 WHERE email = :email"), {"email": email}
    )
    await db_session.commit()

    wl = await client.post("/api/v1/watchlists", json={"name": "T"}, headers=headers)
    wl_id = wl.json()["id"]

    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
    )
    assert resp.status_code == 201

    resp = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["MSFT"]}, headers=headers
    )
    assert resp.status_code == 429


async def test_last_viewed_at_is_advance_only(client: AsyncClient, registered_user, symbol_ids):
    _, _, headers = registered_user
    wl = await client.post("/api/v1/watchlists", json={"name": "T"}, headers=headers)
    wl_id = wl.json()["id"]
    item = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
    )
    item_id = item.json()["id"]

    ack1 = await client.post(
        f"/api/v1/watchlists/{wl_id}/items/{item_id}/acknowledge",
        json={"as_of": "2026-06-01T00:00:00Z"},
        headers=headers,
    )
    assert ack1.status_code == 200
    first_ts = ack1.json()["last_viewed_at"]

    # Rewind attempt -> trigger clamps it, value must not move backward
    ack2 = await client.post(
        f"/api/v1/watchlists/{wl_id}/items/{item_id}/acknowledge",
        json={"as_of": "2020-01-01T00:00:00Z"},
        headers=headers,
    )
    assert ack2.status_code == 200
    assert ack2.json()["last_viewed_at"] == first_ts


async def test_list_items_reflects_adds_and_removes(client: AsyncClient, registered_user, symbol_ids):
    """Backs the frontend's watchlist management page (added during
    frontend integration — GET /watchlists/{id}/items didn't exist until
    then, since prior endpoints only ever returned items as a side effect
    of a mutation)."""
    _, _, headers = registered_user
    wl = await client.post("/api/v1/watchlists", json={"name": "T"}, headers=headers)
    wl_id = wl.json()["id"]

    resp = await client.get(f"/api/v1/watchlists/{wl_id}/items", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []

    item = await client.post(
        f"/api/v1/watchlists/{wl_id}/items", json={"symbol_id": symbol_ids["AAPL"]}, headers=headers
    )
    item_id = item.json()["id"]

    resp = await client.get(f"/api/v1/watchlists/{wl_id}/items", headers=headers)
    assert resp.status_code == 200
    tickers = [i["symbol"]["ticker"] for i in resp.json()]
    assert tickers == ["AAPL"]

    await client.delete(f"/api/v1/watchlists/{wl_id}/items/{item_id}", headers=headers)
    resp = await client.get(f"/api/v1/watchlists/{wl_id}/items", headers=headers)
    assert resp.json() == []


async def test_list_items_unknown_watchlist_is_404(client: AsyncClient, registered_user):
    resp = await client.get(
        "/api/v1/watchlists/00000000-0000-0000-0000-000000000000/items", headers=registered_user[2]
    )
    assert resp.status_code == 404


async def test_ownership_returns_404_not_leaked(client: AsyncClient, registered_user):
    """A watchlist id that doesn't belong to (or doesn't exist for) this
    user is a 404, never a 403 — avoids confirming existence (plan §6)."""
    _, _, headers = registered_user
    resp = await client.patch(
        "/api/v1/watchlists/00000000-0000-0000-0000-000000000000",
        json={"name": "x"},
        headers=headers,
    )
    assert resp.status_code == 404
