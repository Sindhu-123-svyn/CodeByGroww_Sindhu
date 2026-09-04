"""Single place mapping DomainError subclasses to HTTP status codes, so
every service module raises plain Python exceptions and never touches
FastAPI/HTTP concerns directly (keeps the service layer testable in
isolation, and keeps the trigger-exception -> 4xx mapping in one spot,
plan §6).
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.services.errors import (
    DomainError,
    DuplicateWatchlistItemError,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidReorderError,
    SymbolDelistedError,
    SymbolNotFoundError,
    WatchlistItemLimitExceededError,
    WatchlistItemNotFoundError,
    WatchlistNotFoundError,
)

# Extended in later phases as more DomainError subclasses are added.
_STATUS_MAP: dict[type[DomainError], int] = {
    EmailAlreadyRegisteredError: 409,
    InvalidCredentialsError: 401,
    WatchlistNotFoundError: 404,
    WatchlistItemNotFoundError: 404,
    SymbolNotFoundError: 404,
    SymbolDelistedError: 409,          # trigger validate_symbol_active -> clean 4xx (plan §6)
    DuplicateWatchlistItemError: 409,
    WatchlistItemLimitExceededError: 429,  # trigger enforce_watchlist_item_limit -> clean 4xx
    InvalidReorderError: 400,
}


async def _domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    status_code = _STATUS_MAP.get(type(exc), 400)
    return JSONResponse(status_code=status_code, content={"detail": str(exc)})


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _domain_error_handler)
