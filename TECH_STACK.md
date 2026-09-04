# Tech Stack — Smart Market Watchlist

Compiled from `README.md` and `smart-market-watchlist-design.md`.

## Frontend
- **React** — digest-first UI (home/digest view, watchlist management, symbol detail view)

## Backend / API
- **FastAPI** (Python) — REST API layer: watchlist CRUD, `GET /digest` (diff engine), symbol detail, auth, `last_viewed_at` cursor
- Stateless API design — horizontally scalable, all state kept in Postgres/Redis

## Background Jobs / Workers
- **Ingestion Worker** — scheduled polling process that fetches market data once per unique symbol, normalizes ticks, tags source, applies split/dividend adjustments
- **Signal / Change Detection Engine** — scheduled job computing rolling baseline stats (volatility, avg volume, 52w high/low) and generating classified, scored `ChangeEvent`s
- Both are decoupled, independently retryable background processes (no shared mutable state with the API beyond DB/cache)

## Database
- **PostgreSQL** — primary datastore for users, watchlists, watchlist items, price ticks (append-only), symbol baselines, change events

## Cache
- **Redis** — latest quotes, current digest cache (short TTL), rate-limit tracking

## External Services
- A single **free-tier market data API** (provider unspecified — left as an implementation choice) for price/volume ticks

## Reliability Patterns (cross-cutting, not a separate stack layer)
- Timeouts + exponential backoff + circuit breaker on all external API calls

## Explicitly Deferred (documented, not built for v1)
- **WebSocket / SSE** — real-time push of `ChangeEvent`s (v1 uses polling instead)
- **ML-based anomaly detection** — v1 uses explainable statistical (z-score) methods instead
- Full OAuth/SSO — minimal auth only
- Multi-exchange production-grade data licensing
- Message queue / microservice mesh / multi-region deployment
