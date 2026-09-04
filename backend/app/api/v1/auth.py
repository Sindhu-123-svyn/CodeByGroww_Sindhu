from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import TokenOut, UserLogin, UserMeOut, UserOut, UserRegister
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> User:
    return await register_user(db, payload.email, payload.password)


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenOut:
    user = await authenticate_user(db, payload.email, payload.password)
    token, expires_in = create_access_token(user.id, user.email)
    return TokenOut(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=UserMeOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
