# Smart Market Watchlist — Frontend

React + TypeScript SPA implementing the digest-first UI described in
[`../smart-market-watchlist-design.md`](../smart-market-watchlist-design.md),
talking to the FastAPI backend in [`../backend`](../backend). Built per the
plan from this session (Vite, TanStack Query, React Router, `@dnd-kit`,
`recharts`).

> **Running the whole stack via Docker?** See [`../RUNBOOK.md`](../RUNBOOK.md)
> — `docker compose up --build -d` from the project root builds and serves
> this frontend (via nginx) together with the backend. Everything below is
> for running the Vite dev server directly instead.

## Prerequisites

- Node.js 18+ (developed against Node 22)
- The backend running locally at `http://localhost:8000` (see
  `../backend/README.md`) — including its `CORSMiddleware` allowing
  `http://localhost:5173` and `http://localhost:5180`.

## Setup

```bash
npm install
cp .env.local.example .env.local   # if not already present; defaults point at localhost:8000
```

## Running it

```bash
npm run dev                          # http://localhost:5173 (default Vite port)
npm run dev -- --port 5180 --strictPort   # use this if 5173 is already taken by something
                                            # else on your machine — 5180 is also
                                            # allowlisted in the backend's CORS config
npm run build       # type-check (tsc -b) + production build
npm run preview     # serve the production build locally
npm test            # vitest run — 18 component/unit tests
npm run lint         # oxlint
```

## Structure

See `src/api/` for the typed backend client (mirrors `backend/app/schemas/*.py`
exactly), `src/auth/` for the session/JWT layer, `src/hooks/` for the
TanStack Query hooks, `src/pages/` for the five routes (login, register,
digest, watchlist management, symbol detail), and `src/components/` grouped
by feature area (`digest/`, `watchlist/`, `symbol/`, `shared/`).

## Verifying against the seeded demo scenario

Log in as `demo1@example.com` (password set during backend Phase 6
verification — see `../backend/README.md`) and open the digest ("/"). Its
"Tech Growth" watchlist is the concrete acceptance fixture for the whole
digest view:
- **AAPL** → `major` (real price/volume events fired by the Signal Engine)
- **MSFT** → `no_change` (its one seeded event predates its last-viewed cursor)
- **TSLA** → `baseline_status: "building"` (too little history yet)

## Known integration-driven backend addition

`GET /watchlists/{id}/items` did not exist in the original backend build —
every prior endpoint only returned items as a side effect of a mutation
(add/reorder). The watchlist management page needs to list current items
after a plain page load, so this endpoint was added during frontend
integration (`backend/app/api/v1/watchlists.py`, `watchlist_service.list_items`),
with its own integration tests.

## Known local-dev-only shortcuts

- `VITE_API_BASE_URL` defaults to `http://localhost:8000/api/v1`.
- JWT stored in `localStorage` — documented tradeoff, see `src/lib/tokenStorage.ts`.
- CORS on the backend is allowlisted to `http://localhost:5173` only.
