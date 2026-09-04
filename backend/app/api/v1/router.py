from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.digest import router as digest_router
from app.api.v1.symbols import router as symbols_router
from app.api.v1.watchlists import router as watchlists_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(watchlists_router)
api_router.include_router(symbols_router)
api_router.include_router(digest_router)
