import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.schemas.symbol import SymbolDetailOut, SymbolOut
from app.services import symbol_service

router = APIRouter(prefix="/symbols", tags=["symbols"])


# NOTE: /search must be registered before /{symbol_id} — Starlette matches
# routes in registration order and does not backtrack past a path-shape
# match, so /{symbol_id} first would swallow "search" as an invalid UUID.
@router.get("/search", response_model=list[SymbolOut])
async def search_symbols(
    q: str = Query(min_length=1),
    exchange_code: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SymbolOut]:
    return await symbol_service.search_symbols(db, q, exchange_code)


@router.get("/{symbol_id}/validate")
async def validate_symbol(
    symbol_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await symbol_service.validate_symbol(db, symbol_id)
    return {"valid": True}


@router.get("/{symbol_id}", response_model=SymbolDetailOut)
async def get_symbol_detail(
    symbol_id: uuid.UUID,
    range: str = Query(default="90d", alias="range"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SymbolDetailOut:
    return await symbol_service.get_symbol_detail(db, symbol_id, range)
