"""Import every model module so Base.metadata is fully populated for Alembic
autogenerate/stamp and for any code that does `from app.db.base import Base`.
"""
from app.db.models.market_data import CorporateAction, PriceTick  # noqa: F401
from app.db.models.reference import DataSource, Exchange, Symbol  # noqa: F401
from app.db.models.signals import ChangeEvent, SymbolBaseline  # noqa: F401
from app.db.models.user import User  # noqa: F401
from app.db.models.watchlist import Watchlist, WatchlistItem  # noqa: F401
