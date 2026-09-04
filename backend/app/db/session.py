from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# Stateless API layer (README §3.3): the engine holds a connection pool, no
# per-request state lives on the process itself.
engine = create_async_engine(settings.database_url, pool_pre_ping=True, future=True)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: one AsyncSession per request, always closed."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
