import uuid

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.redis_client import get_redis
from app.schemas.digest import DigestOut
from app.services import digest_service

router = APIRouter(tags=["digest"])


@router.get("/digest", response_model=DigestOut)
async def get_digest(
    watchlist_id: uuid.UUID | None = Query(default=None),
    severity_min: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> DigestOut:
    return await digest_service.build_digest(db, current_user.id, watchlist_id, severity_min, redis)
