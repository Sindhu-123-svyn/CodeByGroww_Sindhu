"""Centralized settings, loaded once from .env via pydantic-settings.

See DATABASE_SCHEMA.sql and smart-market-watchlist-design.md for the
requirements each setting exists to satisfy (referenced inline below).
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Local-dev-only credentials baked into smart-market-db's container env.
    # Documented shortcut per DATABASE_SCHEMA.sql notes — never carry into a
    # shared/deployed environment.
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/smart_market_watchlist"
    )
    redis_url: str = "redis://localhost:6379/0"

    # Minimal auth scope (design doc §6 / README §6)
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Ingestion Worker — market-hours-aware polling (design §3.4)
    ingestion_interval_open_seconds: int = 30
    ingestion_interval_offhours_seconds: int = 900

    # Staleness threshold before a tick is excluded from detection (design §3.1)
    staleness_threshold_minutes: int = 5

    # Signal Engine — below this sample_size, a symbol is "building baseline"
    # rather than falsely reporting "no meaningful change" (design §3.5)
    baseline_min_sample_size: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
