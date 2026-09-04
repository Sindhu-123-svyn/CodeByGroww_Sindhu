import uuid

from fastapi import Depends, Header
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db
from app.services.auth_service import get_user_by_id
from app.services.errors import InvalidCredentialsError


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decodes the bearer JWT and loads the User. Every protected route
    depends on this and must scope its queries to the returned user's id —
    watchlists are owned, never cross-user readable (plan §6).
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise InvalidCredentialsError("missing or malformed Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise InvalidCredentialsError("invalid or expired token")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise InvalidCredentialsError("malformed token")

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise InvalidCredentialsError("user no longer exists")
    return user
