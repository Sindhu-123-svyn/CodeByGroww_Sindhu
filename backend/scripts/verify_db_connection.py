"""Phase 0 'done' check: connect via the ORM and confirm the seeded symbols
are readable. Run with: python -m scripts.verify_db_connection
"""
import asyncio

from sqlalchemy import select

from app.db.models import Symbol
from app.db.session import AsyncSessionLocal


async def main() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Symbol.ticker, Symbol.status).order_by(Symbol.ticker))
        rows = result.all()
        print(f"Connected. {len(rows)} symbols found:")
        for ticker, status in rows:
            print(f"  {ticker:6s} {status}")


if __name__ == "__main__":
    asyncio.run(main())
