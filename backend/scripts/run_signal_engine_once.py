"""Phase 5 'done' check / manual dev trigger: one detection pass, no loop.
Run with: python -m scripts.run_signal_engine_once
"""
import asyncio
import logging

from workers.signal_engine.detect_job import run_once

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def main() -> None:
    written = await run_once()
    print(f"Wrote {written} new change_events.")


if __name__ == "__main__":
    asyncio.run(main())
