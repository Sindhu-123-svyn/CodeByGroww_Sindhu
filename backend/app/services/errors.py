"""Domain-error hierarchy the service layer raises and app/core/exceptions.py
translates into clean HTTP responses — the concrete mechanism satisfying
"catch the DB trigger's RAISE EXCEPTION and turn it into a clean 4xx"
(plan §6). Grown incrementally, phase by phase, rather than declared all at
once — each error is added when the service that raises it is built.
"""


class DomainError(Exception):
    """Base class for every error the API's exception handler knows how to
    translate. Never raise this directly — raise a specific subclass."""


# --- Auth (Phase 1) ---------------------------------------------------------


class EmailAlreadyRegisteredError(DomainError):
    def __init__(self, email: str) -> None:
        super().__init__(f"an account with email '{email}' already exists")


class InvalidCredentialsError(DomainError):
    def __init__(self, reason: str = "invalid email or password") -> None:
        super().__init__(reason)


# --- Watchlists (Phase 2) ---------------------------------------------------


class WatchlistNotFoundError(DomainError):
    def __init__(self, watchlist_id) -> None:
        super().__init__(f"watchlist '{watchlist_id}' not found")


class WatchlistItemNotFoundError(DomainError):
    def __init__(self, item_id) -> None:
        super().__init__(f"watchlist item '{item_id}' not found")


class SymbolNotFoundError(DomainError):
    def __init__(self, symbol_id) -> None:
        super().__init__(f"symbol '{symbol_id}' not found")


class SymbolDelistedError(DomainError):
    def __init__(self, symbol_id) -> None:
        super().__init__(f"symbol '{symbol_id}' is delisted and cannot be added to a watchlist")


class DuplicateWatchlistItemError(DomainError):
    def __init__(self, symbol_id) -> None:
        super().__init__(f"symbol '{symbol_id}' is already in this watchlist")


class WatchlistItemLimitExceededError(DomainError):
    def __init__(self, limit: int) -> None:
        super().__init__(f"watchlist item limit ({limit}) exceeded")


class InvalidReorderError(DomainError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
