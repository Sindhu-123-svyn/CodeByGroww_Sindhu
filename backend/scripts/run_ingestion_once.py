"""Phase 3 'done' check / manual dev trigger: one full ingestion pass, no
scheduler. Run with: python -m scripts.run_ingestion_once
"""
import asyncio
import logging

from workers.ingestion.ingest_job import run_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def main() -> None:
    ticks = await run_once()
    print(f"Ingested {len(ticks)} ticks.")
    for t in ticks:
        print(f"  symbol_id={t.symbol_id} price={t.price} volume={t.volume} tick_time={t.tick_time}")


if __name__ == "__main__":
    asyncio.run(main())
