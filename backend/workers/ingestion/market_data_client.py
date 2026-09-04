"""Wraps yfinance (unofficial Yahoo Finance library — our chosen free-tier
market data provider, plan Context) with a timeout, exponential-backoff
retries, and a per-process circuit breaker. Treated exactly like any other
"external, unreliable" dependency (design §2.3): one flaky/rate-limited
provider must never cascade into a full ingestion outage.
"""
import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

import yfinance as yf

logger = logging.getLogger("workers.ingestion.market_data_client")


@dataclass(frozen=True)
class Quote:
    price: float
    open: float | None
    volume: int
    tick_time: datetime


class CircuitOpenError(Exception):
    """Raised instead of attempting a fetch while the breaker is open."""


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    cooldown_seconds: float = 60.0
    _consecutive_failures: int = field(default=0, init=False)
    _opened_at: float | None = field(default=None, init=False)

    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        if time.monotonic() - self._opened_at >= self.cooldown_seconds:
            return False  # half-open: allow the next attempt through
        return True

    def record_success(self) -> None:
        self._consecutive_failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._consecutive_failures += 1
        if self._consecutive_failures >= self.failure_threshold:
            self._opened_at = time.monotonic()


_breaker = CircuitBreaker()


def _fetch_quote_sync(ticker: str) -> Quote:
    t = yf.Ticker(ticker)
    fast = t.fast_info
    hist = t.history(period="5d", interval="1d")
    if hist.empty:
        raise ValueError(f"no data returned for {ticker}")
    last = hist.iloc[-1]
    price = float(fast.last_price) if fast.last_price else float(last["Close"])
    return Quote(
        price=price,
        open=float(last["Open"]),
        volume=int(last["Volume"]),
        tick_time=hist.index[-1].to_pydatetime(),
    )


async def fetch_quote(ticker: str, max_attempts: int = 3, base_delay: float = 1.0) -> Quote:
    """Runs the blocking yfinance call in a thread with a deadline, retries
    with jittered exponential backoff, and short-circuits entirely while the
    breaker is open (design §2.3)."""
    if _breaker.is_open():
        raise CircuitOpenError(f"circuit open for market data client (ticker={ticker})")

    last_exc: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            quote = await asyncio.wait_for(asyncio.to_thread(_fetch_quote_sync, ticker), timeout=8.0)
            _breaker.record_success()
            return quote
        except Exception as exc:  # noqa: BLE001 — deliberately broad: any failure mode of an unofficial library
            last_exc = exc
            _breaker.record_failure()
            logger.warning("fetch_quote(%s) attempt %d/%d failed: %s", ticker, attempt, max_attempts, exc)
            if attempt < max_attempts:
                await asyncio.sleep(base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5))
    assert last_exc is not None
    raise last_exc
