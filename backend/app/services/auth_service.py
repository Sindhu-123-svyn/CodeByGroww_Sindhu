import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.db.models import User
from app.services.errors import EmailAlreadyRegisteredError, InvalidCredentialsError


async def register_user(db: AsyncSession, email: str, password: str) -> User:
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise EmailAlreadyRegisteredError(email)
    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    # Same error for "no such user" and "wrong password" — never leak which
    # one it was.
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()
    return user


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)
