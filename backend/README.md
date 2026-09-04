# Smart Market Watchlist — Backend

FastAPI backend implementing [`../smart-market-watchlist-design.md`](../smart-market-watchlist-design.md)
against the schema in [`../DATABASE_SCHEMA.sql`](../DATABASE_SCHEMA.sql). Built
following the phased plan in this session — see the plan file for the full
design rationale.

> **Running the whole stack via Docker?** See [`../RUNBOOK.md`](../RUNBOOK.md)
> — `docker compose up --build -d` from the project root runs this backend,
> both workers, Postgres, Redis, and the frontend together. Everything
> below is for running the backend directly on your machine instead.

## Prerequisites

- Python 3.11+ (developed against 3.13)
- Docker (for Postgres + Redis)

## One-time setup

```bash
# 1. Postgres — already documented in DATABASE_SCHEMA.sql's own setup;
#    a container named smart-market-db on localhost:5432 is assumed to
#    exist already with the schema + seed data applied.

# 2. Redis
docker compose up -d redis

# 3. Python deps
pip install -r requirements.txt

# 4. Env
cp .env.example .env    # defaults already point at the local containers

# 5. Alembic baseline (schema is raw-SQL-authoritative; this just stamps
#    the existing DB as the migration starting point)
python -m alembic stamp head
```

## Running it

```bash
# API server
python -m uvicorn app.main:app --reload --port 8000
# docs at http://127.0.0.1:8000/docs

# Ingestion Worker (separate process, polls yfinance on a market-hours-aware
# schedule, never imported by the API)
python -m workers.ingestion

# Signal / Change Detection Engine (separate process, computes baselines +
# classifies change_events)
python -m workers.signal_engine

# One-off manual triggers (no scheduler loop) for local dev/demo:
python -m scripts.run_ingestion_once
python -m scripts.run_signal_engine_once
python -m scripts.verify_db_connection
```

> **Note on `--reload`**: it has been flaky in this environment (routes
> silently not re-registering after some edits without a visible error).
> If routes 404 unexpectedly after an edit, restart the server without
> `--reload` rather than trusting the hot-reload.

## Tests

```bash
python -m pytest tests/            # unit + integration, 51 tests
python -m pytest tests/unit -v     # classifiers/baseline/adjuster only — fast, no DB
python -m pytest tests/integration -v   # hits the real local Postgres/Redis
```

Integration tests create disposable randomly-named users per run and are
safe to re-run against the shared local dev database.

## Frontend integration

A React frontend now lives at `../frontend` (see its own README). Two
things were added to this backend specifically for that integration:
- `CORSMiddleware` in `app/main.py`, allowlisted to `http://localhost:5173`
  (the Vite dev server) — without it the browser blocks every request.
- `GET /watchlists/{id}/items`, which didn't exist before — every other
  watchlist-item endpoint only returned items as a side effect of a
  mutation, but the frontend's management page needs to list current items
  after a plain page load.

## API surface

All endpoints under `/api/v1`, JWT bearer auth except `/auth/register` and
`/auth/login`. Full interactive docs at `/docs` once the server is running.
See the plan document for the endpoint-by-endpoint spec and which design-doc
requirement each satisfies.

## Known local-dev-only shortcuts

- `postgres`/`postgres` DB credentials, `dev-only-change-me` JWT secret —
  documented shortcuts, not for anything beyond local development.
- `SEED_DATA.sql`'s `demo1@example.com`/`demo2@example.com` users originally
  had placeholder (non-bcrypt) password hashes; `demo1` was given a real one
  during Phase 6 verification (password: see project notes) so the seeded
  "Tech Growth" watchlist scenario could be exercised end-to-end. `demo2`
  still has a placeholder hash and cannot log in as-is.
