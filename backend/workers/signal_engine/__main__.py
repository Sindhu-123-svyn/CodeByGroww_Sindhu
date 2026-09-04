"""Entrypoint: python -m workers.signal_engine

Loops on a looser schedule than ingestion (design §4: "poll-the-table style
for v1 simplicity" — a natural v2 upgrade is Postgres LISTEN/NOTIFY on new
ticks instead of polling).
"""
import asyncio
import logging

from workers.signal_engine.detect_job import run_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("workers.signal_engine")

DETECTION_INTERVAL_SECONDS = 60


async def main() -> None:
    while True:
        written = await run_once()
        logger.info("detection pass complete: %d new change_events", written)
        await asyncio.sleep(DETECTION_INTERVAL_SECONDS)


if __name__ == "__main__":
    asyncio.run(main())
