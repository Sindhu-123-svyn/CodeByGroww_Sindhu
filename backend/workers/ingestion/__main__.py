"""Entrypoint: python -m workers.ingestion

Runs the market-hours-aware scheduling loop forever. For a one-off pass
(local dev/demo), use scripts/run_ingestion_once.py instead.
"""
import asyncio
import logging
import os

from workers.ingestion.scheduler import run_forever

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

if __name__ == "__main__":
    shard_index = int(os.environ.get("SHARD_INDEX", "0"))
    shard_count = int(os.environ.get("SHARD_COUNT", "1"))
    asyncio.run(run_forever(shard_index=shard_index, shard_count=shard_count))
