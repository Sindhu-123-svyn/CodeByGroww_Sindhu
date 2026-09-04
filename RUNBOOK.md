# Smart Market Watchlist — Run & Verify Guide

One place with every step to get the whole stack running locally and confirm
each piece actually works — not just "the server started," but "the product
is doing the thing the design doc says it should do."

Companion docs: [`README.md`](README.md) (the brief),
[`smart-market-watchlist-design.md`](smart-market-watchlist-design.md) (architecture),
[`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

---

## 0. What you're running

| Piece | Tech | Default address |
|---|---|---|
| Postgres | Docker container `smart-market-db` | `localhost:5432` |
| Redis | Docker container `smart-market-redis` | `localhost:6379` |
| Backend API | FastAPI | `http://localhost:8000` |
| Ingestion Worker | Python process | (no port — background job) |
| Signal Engine | Python process | (no port — background job) |
| Frontend | Vite + React | `http://localhost:5173` (or `5180` — see [Troubleshooting](#troubleshooting)) |

The backend, workers, and frontend are three **separate processes** by
design (design doc §2.1) — none of them import or start the others.

---

## Quick start (Docker Compose — recommended)

The whole stack — Postgres, Redis, backend API, both workers, and the
frontend (built and served by nginx) — is defined in
[`docker-compose.yml`](docker-compose.yml). This is the fastest, most
reproducible way to run everything; **§1–3 below are only needed if you
want to run pieces individually outside Docker** (e.g. active backend
development with fast restarts).

```bash
docker compose up --build -d
```

That's the entire setup — no manual schema/seed/password steps. On a first
run (empty Postgres volume), the schema and seed data are applied
automatically via `docker-entrypoint-initdb.d`, including a real password
for the `demo1@example.com` demo account (see `docker/init/03-demo-password.sql`).

**✅ Checkpoint:**
```bash
docker compose ps
```
Expect 6 services, all `Up` (`db`, `redis`, `backend`, `frontend` should
show `(healthy)`; `ingestion-worker`/`signal-engine` have no healthcheck
but should show `Up`, not `Exited`). Then jump straight to
[§4, Verify it's working](#4-verify-its-working) — every command there
works identically whether the stack is running via Docker or manually.

**Ports:** backend `:8000`, frontend `:5180`, Postgres `:5432`, Redis `:6379`
(all published to the host, same as the manual setup below).

**Logs / stop / reset:**
```bash
docker compose logs -f backend          # or: ingestion-worker, signal-engine, frontend, db, redis
docker compose down                     # stop everything, keep data
docker compose down -v                  # stop everything AND wipe the Postgres volume (re-seeds fresh next `up`)
```

**Rebuilding after a code change:** Compose doesn't hot-reload — after
editing backend or frontend source, re-run `docker compose up --build -d`
(only the changed image(s) actually rebuild; Docker layer-caches the rest).

---

## 1. Prerequisites (manual / non-Docker setup only)

- Docker Desktop running
- Python 3.11+ (`python --version`)
- Node.js 18+ (`node --version`)

---

## 2. One-time setup

> **Manual/non-Docker path.** If you used `docker compose up --build -d`
> above, skip to [§4](#4-verify-its-working) — this and §3 are for running
> the backend/frontend directly on your machine instead (e.g. for faster
> edit-restart cycles while developing).

Skip any step whose result already exists (e.g. containers already running,
`node_modules`/`.venv` already installed).

### 2.1 Database + cache containers

```bash
docker run -d --name smart-market-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=smart_market_watchlist -p 5432:5432 postgres:16
docker run -d --name smart-market-redis -p 6379:6379 redis:7-alpine
```

Wait ~10s for Postgres to finish initializing, then apply the schema and
seed data (from the project root):

```bash
docker cp DATABASE_SCHEMA.sql smart-market-db:/schema.sql
docker cp SEED_DATA.sql smart-market-db:/seed.sql
docker exec -i smart-market-db psql -U postgres -d smart_market_watchlist -v ON_ERROR_STOP=1 -f /schema.sql
docker exec -i smart-market-db psql -U postgres -d smart_market_watchlist -v ON_ERROR_STOP=1 -f /seed.sql
```

**✅ Checkpoint:**
```bash
docker exec -i smart-market-db psql -U postgres -d smart_market_watchlist -c "SELECT ticker, status FROM symbols ORDER BY ticker;"
```
Expect 6 rows: `AAPL, GOOGL, JPM, MSFT, SIVB (delisted), TSLA`.

### 2.2 Backend dependencies

```bash
cd backend
pip install -r requirements.txt
```
`.env` already exists with local-dev defaults (`postgres`/`postgres`,
`localhost:5432`, `localhost:6379`) — no changes needed unless you changed a
container's credentials.

### 2.3 A real login for the seeded demo account

`SEED_DATA.sql`'s `demo1@example.com` ships with a placeholder (non-bcrypt)
password hash — it can't log in as-is. Set a real one once:

```bash
cd backend
python -c "from app.core.security import hash_password; print(hash_password('demopass123'))"
```
Copy the printed hash into:
```bash
docker exec -i smart-market-db psql -U postgres -d smart_market_watchlist -c "UPDATE users SET password_hash = '<paste hash here>' WHERE email='demo1@example.com';"
```
You'll use `demo1@example.com` / `demopass123` in the verification steps
below — its seeded "Tech Growth" watchlist is the acceptance fixture the
whole digest view is built to prove.

### 2.4 Frontend dependencies

```bash
cd frontend
npm install
```

---

## 3. Running everything

Open **four** terminals (or run each with `&`/background jobs — order
matters only in that the backend/workers need Postgres+Redis already up).

**Terminal 1 — backend API**
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
> Don't add `--reload` — it has been unreliable in this environment (routes
> can silently fail to re-register after an edit with no visible error).
> If you edit backend code, stop (Ctrl+C) and re-run this command instead.

**Terminal 2 — Ingestion Worker** (polls real market data via `yfinance`)
```bash
cd backend
python -m workers.ingestion
```
For a single pass instead of the continuous scheduler:
```bash
python -m scripts.run_ingestion_once
```

**Terminal 3 — Signal Engine** (computes baselines + detects changes)
```bash
cd backend
python -m workers.signal_engine
```
For a single pass instead of the continuous loop:
```bash
python -m scripts.run_signal_engine_once
```

**Terminal 4 — frontend**
```bash
cd frontend
npm run dev
```
If port `5173` is already taken by something else on your machine, use the
pinned alternate port (already allowlisted in the backend's CORS config):
```bash
npm run dev -- --port 5180 --strictPort
```

---

## 4. Verify it's working

Work through these in order — each one builds on the last.

### 4.1 Backend is up and reachable

```bash
curl http://localhost:8000/health
```
**✅ Expect:** `{"status":"ok"}`

### 4.2 CORS is correctly configured for the frontend

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:8000/health
```
**✅ Expect:** an `access-control-allow-origin: http://localhost:5173` response
header. (Use `5180` in both the `Origin` header and the check if that's the
port your frontend is actually running on.)

### 4.3 Auth works end-to-end

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo1@example.com","password":"demopass123"}'
```
**✅ Expect:** a JSON body with `access_token`, `token_type: "bearer"`, `expires_in: 3600`.
If you get `401`, redo step [2.3](#23-a-real-login-for-the-seeded-demo-account).

### 4.4 The frontend loads and you can log in

1. Open `http://localhost:5173` (or `:5180`) in a browser.
2. Log in with `demo1@example.com` / `demopass123`.
3. **✅ Expect:** you land on the **Digest** page, not an error screen.

### 4.5 The digest matches the seeded scenario — the most important check

This is the literal proof that the "since last visit" mechanic (design
§1.4) works, not just that the UI renders. On the Digest page, with the
**Tech Growth** watchlist selected, immediately after a fresh seed (before
the workers have run against it):

| Symbol | Expected bucket | Why |
|---|---|---|
| **AAPL** | **Major** | Its seeded price/volume-spike events are *after* its last-viewed cursor |
| **MSFT** | **No change** | Its one seeded event is *before* its last-viewed cursor — proves events aren't just dumped in regardless of when you last looked |
| **TSLA** | **No change**, with a **"Building baseline"** notice | Too little price history yet — proven as an honest state, not a fake "no change" |

**✅ Expect:** exactly this grouping. If AAPL isn't under Major, the workers
in Terminal 2/3 likely haven't run yet against fresh data — that's fine,
the seeded events alone are enough to produce this result even with the
workers idle.

> **Note on "Building baseline":** right after a fresh seed, *all three*
> symbols show this banner — the seed data alone (7-9 ticks each) doesn't
> reach the 10-sample threshold the Signal Engine requires before it calls
> a baseline "ready" (design §3.5). This is independent of which bucket a
> symbol lands in — AAPL is still correctly `major` despite `building`,
> because its bucket comes from its already-seeded `change_events`, not
> from baseline readiness. Running the Ingestion Worker + Signal Engine
> repeatedly (§4.9) is what accumulates enough real ticks to flip AAPL/MSFT
> to `ready`; TSLA stays `building` far longer since it only has 3 seeded
> ticks to start from.

### 4.6 Acknowledge is explicit, never automatic

1. On an entry with events (e.g. AAPL), click **Mark as read**.
2. **✅ Expect:** it moves out of the Major group.
3. Refresh the page *without* clicking anything else.
4. **✅ Expect:** nothing changes back — viewing the page never re-marks
   anything as unseen or seen. (This is also covered by an automated test —
   see [5.2](#52-frontend-tests).)

### 4.7 Watchlist management works

1. Go to **Manage Watchlists**.
2. Search for a ticker (e.g. `MSFT`) and add it to a watchlist.
3. Search for `SIVB` (Silicon Valley Bank — seeded as delisted).
   **✅ Expect:** it shows disabled with a "delisted" reason, and the Add
   button is unusable — proves the pre-check against the backend's
   `validate_symbol_active` trigger works.
4. Drag two items to reorder them, then refresh the page.
   **✅ Expect:** the new order persisted.
5. Delete a watchlist.
   **✅ Expect:** a confirmation dialog appears (not a browser popup) before
   anything is removed.

### 4.8 Symbol detail / drill-down works

1. Click any ticker (from the digest or watchlist manager).
2. **✅ Expect:** a price chart, baseline stats, recent activity, and (for
   TSLA specifically) its real 2022 3-for-1 stock split listed under
   **Corporate Actions**.

### 4.9 The ingestion + detection pipeline produces real data

With Terminals 2 and 3 running (or after a manual one-shot run):
```bash
cd backend
python -m scripts.run_ingestion_once
python -m scripts.run_signal_engine_once
```
**✅ Expect:** log lines like `AAPL: price=... volume=... state=...` from
ingestion, and (if a real threshold is crossed) `AAPL: price_shock (major, score=...)`
from the signal engine. Refresh the Digest page afterward to see it reflected.

---

## 5. Run the automated test suites

### 5.1 Backend tests
```bash
cd backend
python -m pytest tests/
```
**✅ Expect:** `53 passed`. Covers auth, the DB-trigger→HTTP-error
translation, rate limiting, the digest diff logic, idempotent event
writes, and the classifier/baseline math (unit tests, no DB needed).

### 5.2 Frontend tests
```bash
cd frontend
npm test
```
**✅ Expect:** `18 passed`. Covers digest severity grouping/ordering, that
"Mark as read" is never called automatically, stale/missing-quote
rendering, the delisted-symbol search pre-check, and API error parsing.

---

## Troubleshooting

**`docker compose up` fails to bind port 5432/6379/8000/5180** — you likely
still have the standalone (non-Compose) containers or manually-started
`uvicorn`/`vite` processes from the manual setup running. Stop those first
(`docker stop smart-market-db smart-market-redis` if you created them that
way previously, plus Ctrl+C any manually-run backend/frontend terminals) —
Compose and the manual path both want the same host ports.

**`ingestion-worker` container exits immediately with a `ForeignKeyViolationError`
on `price_ticks_source_code_fkey`** — this was a real bug caught while
dockerizing: the scheduler (`workers.ingestion`, what the container actually
runs) never ensured the `yfinance` row existed in `data_sources` — only the
one-shot script did. Fixed in `backend/workers/ingestion/scheduler.py`
(`run_forever` now ensures it once at startup). If you see this, you're on
an image built before the fix — `docker compose up --build -d ingestion-worker`.

**Port `5173` already in use by something else on this machine** — don't
assume it's a leftover from this project; check what it is
(`Get-NetTCPConnection -LocalPort 5173` on Windows) before killing anything.
Run the frontend on the pinned alternate instead:
```bash
npm run dev -- --port 5180 --strictPort
```
(already allowlisted in `backend/app/main.py`'s CORS config).

**Frontend requests are blocked / CORS errors in the browser console** —
confirm the origin you're actually using is in `backend/app/main.py`'s
`allow_origins` list, then restart the backend (CORS config changes need a
restart, not a hot reload).

**Backend routes 404 after an edit** — `--reload` has been unreliable here.
Stop the server (Ctrl+C) and start it fresh without `--reload`.

**`yfinance` calls fail with garbled/empty responses** — this has happened
with older `yfinance` versions against Yahoo's current API. Confirm
`pip show yfinance` reports `1.7.0` (pinned in `requirements.txt`); if not,
`pip install -U yfinance==1.7.0`.

**Ingestion ticks all show `is_stale: true` outside market hours** — this is
correct, not a bug: the staleness threshold only applies while the market
is open (design §3.1). Outside trading hours, the last close is the
expected price, not a stale one.

**A fresh symbol never gets classified** — the Signal Engine only
classifies ticks it hasn't seen before (tracked via each tick's `fetched_at`
against the baseline's last `computed_at`). If you're testing manually and
want to force a re-classification, clear that symbol's baseline row:
```bash
docker exec -i smart-market-db psql -U postgres -d smart_market_watchlist -c "DELETE FROM symbol_baselines WHERE symbol_id = (SELECT id FROM symbols WHERE ticker='AAPL');"
```
then re-run `python -m scripts.run_signal_engine_once`.
