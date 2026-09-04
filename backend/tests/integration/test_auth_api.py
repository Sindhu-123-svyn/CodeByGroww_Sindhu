import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_register_login_me_flow(client: AsyncClient):
    email = f"flow-{uuid.uuid4().hex[:12]}@example.com"
    resp = await client.post("/api/v1/auth/register", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201

    resp = await client.post("/api/v1/auth/register", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 409  # duplicate email

    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "wrongpass"})
    assert login.status_code == 401

    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "testpass123"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


async def test_protected_route_without_token_is_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_protected_route_with_garbage_token_is_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
