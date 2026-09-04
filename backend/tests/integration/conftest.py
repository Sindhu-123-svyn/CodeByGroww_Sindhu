"""Integration fixtures — run against the real local Postgres/Redis (the
same smart-market-db / smart-market-redis containers used for manual
verification throughout the plan), per plan §9: "hit the real Postgres...
fixtures shaped like SEED_DATA.sql". Each test uses a fresh, randomly-named
user so tests are safe to re-run without a separate test database.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models import Symbol
from app.db.session import AsyncSessionLocal
from app.main import app

# The app's SQLAlchemy engine and Redis client are module-level singletons
# bound to whichever event loop is running when first used. pytest-asyncio's
# default per-test loop would invalidate their connection pools between
# tests (asyncpg connections are loop-bound) — every test in this package
# opts into one shared session-scoped loop instead (paired with
# asyncio_default_fixture_loop_scope = session in pytest.ini for fixtures).
pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session


@pytest.fixture
async def registered_user(client: AsyncClient):
    """Returns (email, password, auth_headers)."""
    email = f"test-{uuid.uuid4().hex[:12]}@example.com"
    password = "testpass123"
    resp = await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    token = login.json()["access_token"]
    return email, password, {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def symbol_ids(db_session):
    """Real symbol ids from SEED_DATA.sql — AAPL (active), SIVB (delisted)."""
    result = await db_session.execute(select(Symbol).where(Symbol.ticker.in_(["AAPL", "SIVB", "MSFT"])))
    symbols = {s.ticker: str(s.id) for s in result.scalars().all()}
    return symbols
