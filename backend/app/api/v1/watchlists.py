import uuid

from fastapi import APIRouter, Body, Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.redis_client import get_redis
from app.schemas.watchlist import (
    AcknowledgeRequest,
    ReorderRequest,
    WatchlistCreate,
    WatchlistItemCreate,
    WatchlistItemOut,
    WatchlistListOut,
    WatchlistOut,
    WatchlistUpdate,
)
from app.services import watchlist_service

router = APIRouter(prefix="/watchlists", tags=["watchlists"])


@router.post("", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    payload: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistOut:
    return await watchlist_service.create_watchlist(db, current_user.id, payload.name)


@router.get("", response_model=list[WatchlistListOut])
async def list_watchlists(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[WatchlistListOut]:
    rows = await watchlist_service.list_watchlists(db, current_user.id)
    return [
        WatchlistListOut(id=w.id, name=w.name, created_at=w.created_at, item_count=count)
        for w, count in rows
    ]


@router.patch("/{watchlist_id}", response_model=WatchlistOut)
async def rename_watchlist(
    watchlist_id: uuid.UUID,
    payload: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WatchlistOut:
    return await watchlist_service.rename_watchlist(db, current_user.id, watchlist_id, payload.name)


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(
    watchlist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await watchlist_service.delete_watchlist(db, current_user.id, watchlist_id)


@router.get("/{watchlist_id}/items", response_model=list[WatchlistItemOut])
async def list_items(
    watchlist_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[dict]:
    return await watchlist_service.list_items(db, current_user.id, watchlist_id, redis)


@router.post(
    "/{watchlist_id}/items", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED
)
async def add_item(
    watchlist_id: uuid.UUID,
    payload: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> WatchlistItemOut:
    return await watchlist_service.add_item(db, current_user.id, watchlist_id, payload.symbol_id, redis)


@router.delete("/{watchlist_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    watchlist_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> None:
    await watchlist_service.remove_item(db, current_user.id, watchlist_id, item_id, redis)


@router.patch("/{watchlist_id}/items/reorder", response_model=list[WatchlistItemOut])
async def reorder_items(
    watchlist_id: uuid.UUID,
    payload: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WatchlistItemOut]:
    return await watchlist_service.reorder_items(
        db, current_user.id, watchlist_id, payload.ordered_item_ids
    )


@router.post("/{watchlist_id}/items/{item_id}/acknowledge", response_model=WatchlistItemOut)
async def acknowledge_item(
    watchlist_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: AcknowledgeRequest = Body(default_factory=AcknowledgeRequest),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> WatchlistItemOut:
    return await watchlist_service.acknowledge_item(
        db, current_user.id, watchlist_id, item_id, payload.as_of, redis
    )


@router.post("/{watchlist_id}/acknowledge-all", response_model=list[WatchlistItemOut])
async def acknowledge_all(
    watchlist_id: uuid.UUID,
    payload: AcknowledgeRequest = Body(default_factory=AcknowledgeRequest),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[WatchlistItemOut]:
    return await watchlist_service.acknowledge_all(
        db, current_user.id, watchlist_id, payload.as_of, redis
    )
