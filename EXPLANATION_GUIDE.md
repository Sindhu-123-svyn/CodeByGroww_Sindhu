# Explanation Guide — The Pitch

> A watchlist's job isn't to display prices — it's to answer *"what do I need to know since I last looked?"* in under five seconds. Every decision below is derived from that one sentence.

The obvious version of this brief is a table: ticker, price, daily change. It's easy to build and tells you nothing you couldn't get from a search bar. The version we built instead treats **the gap between visits** as the actual product — the same underlying tick data, diffed against a cursor that belongs to one person, on one symbol, since one moment.

Six questions were ours to answer. Here's how we answered them, and what each answer costs.

---

## 01 — What counts as a meaningful change?

**Relative to the stock, not a flat rule.** ±5% is noise for a small-cap that swings 8% on a quiet Tuesday, and a genuine shock for a utility stock that hasn't moved 2% in a month. So nothing is measured against a fixed threshold — it's measured against **each symbol's own rolling behavior**: 30-day volatility, 20-day average volume, its own 52-week range. Five independent detectors feed one **Attention Score**, bucketed into Major / Notable / Minor / No Change, so a watchlist of twenty names can be ranked by what deserves attention first instead of listed alphabetically.

| Change type | Trigger | Why it's meaningful |
|---|---|---|
| **Price Shock** | `\|Δprice\| / σ₃₀ > 2.0` | A z-score, not a percentage — adjusts for the stock's own normal volatility. |
| **Volume Anomaly** | `volume > 2× avg₂₀` | Unusual volume often precedes or confirms real news, independent of price. |
| **Trend Break** | crosses 52w high/low or 20d moving average | A structural level being crossed, not day-to-day noise. |
| **Gap Event** | `\|open − prev_close\| > 1.5σ` | Catches the overnight move a user missed entirely between visits. |
| **Data Quality Flag** | stale / conflicting / missing tick | A trust signal, not a market signal — kept visually separate so it's never mistaken for one. |

*Seeded example:* two watchers of the same market see different digests. `AAPL` and `GOOGL` have change events after this user's `last_viewed_at`, so they lead the digest; `MSFT` moved too, but before this user's cursor — it correctly shows "nothing new since your last visit," even though the raw price changed.

## 02 — What information to surface?

**The digest is the home screen; the chart is a drill-down.** The home view groups entries by significance, not alphabetically. Each entry carries exactly three things: the delta, a sparkline of the gap period, and a plain-language reason it was flagged — never a bare number without the "why." Full charts, historical stats, and news stay one tap away on the symbol detail page, deliberately kept out of the digest so a five-symbol scan isn't buried under twenty data points nobody asked for. Freshness travels with every price, always — an explicit `updated 42s ago`-style tag, never a number presented as live when it isn't.

## 03 — How state persists across sessions and devices?

**The cursor lives on the server, per symbol, per person.** Watchlists and read state live in Postgres, not local storage — open the app on a laptop, then a phone, and it's the same watchlist with the same unread events, not two divergent copies. The key field is `last_viewed_at`, stored per `(user, watchlist_item)` rather than globally: the same `TSLA` can be "new" to one watcher and "already seen" to another, because they're genuinely being asked different questions.

It only advances when the digest is **explicitly acknowledged** — not on every page load — so a five-second glance at a notification doesn't silently mark a real signal as seen. And it only ever moves **forward**: if the same account is open on two devices at once, the cursor race resolves to whichever advance is later, never earlier — worst case something is marked read a few seconds early, never lost.

## 04 — How to handle stale, delayed, or conflicting data?

**Uncertainty is shown, never smoothed over.** Every tick is tagged with its source and fetch time. Past a staleness threshold — five minutes during market hours — the price grays out in the UI *and* is excluded from change detection, so a stuck feed can never fake a Price Shock. A missing tick is logged as a Data Quality Flag and treated as "insufficient data," never interpolated into an invented price. If a symbol is ever backed by more than one provider and they disagree beyond tolerance, the system doesn't quietly trust the higher-priority source and move on — it surfaces the disagreement itself, because "the data is currently uncertain" is information a user can act on.

*Corporate actions:* `TSLA`'s 2022 3-for-1 split is seeded as a real historical adjustment — without it, the raw price series would register as a catastrophic false Price Shock. Split and dividend factors are applied in ingestion, before a tick ever reaches the detection layer, so mechanical price moves are never confused with market-driven ones.

## 05 — How the system scales?

**Cost tracks symbols tracked, not users watching them.** The single biggest lever in the system: a symbol is fetched once per polling cycle, no matter how many watchlists hold it. 10,000 users watching `AAPL` cost exactly one ingestion call, one baseline recompute, one set of change events — read by everyone through a shared cache, not recomputed per viewer.

```
Ingestion worker → Price store → Signal engine → FastAPI → React digest
(polls once        (shared,       (pure fn per    (stateless,
 per symbol)         append-only)   symbol)         reads only)
```

| Growth axis | Naive bottleneck | Design response |
|---|---|---|
| More users, same symbols | Redundant fetch per user | Shared price cache keyed by symbol; users subscribe, they don't poll. |
| Larger watchlists | Recompute cost per symbol added | Detection is symbol-scoped already — one more watcher adds zero cost. |
| More symbols platform-wide | Ingestion worker saturates | Shard the worker by symbol range; each shard owns a partition. |
| Real-time expectations | Polling can't hit per-second | Documented upgrade to SSE/WebSocket — push the *signal*, not raw ticks. |

## 06 — Where to keep things simple vs. add complexity?

Every hour not spent on infrastructure the product doesn't need yet is an hour spent on the parts that are actually hard to get right: idempotent event generation, a cursor that can't lose data, data quality as a visible state instead of a hidden failure.

**Kept deliberately simple**
- Z-score statistics over ML — explainable, testable with synthetic data, no training pipeline to maintain.
- Polling over a streaming pipeline — validates the change-detection model before paying for real-time infra.
- Postgres over a dedicated time-series database — an append-only table is enough at this scale.
- One free-tier market data source — the licensing problem is orthogonal to the one being solved.
- Minimal auth, no full OAuth/SSO — enough to prove per-user state, not the problem being pitched.
- No message queue or microservice mesh for v1 — three processes and a REST API prove the model.

**Given real engineering weight**
- Ingestion, detection, and API are separate, independently retryable processes — one failing doesn't take the others down.
- `PriceTick` append-only, `ChangeEvent` idempotent on `(symbol, type, time)` — safe to replay after a crash.
- `last_viewed_at` correctness per `(user, item)`, advance-only under concurrent writes.
- Freshness, source, and confidence modeled as explicit fields — never inferred by the frontend.
- Corporate-action adjustment before detection — the easy-to-miss correctness detail that prevents false shocks.

---

## Supporting stack

Every layer below is a real, running service in this repo — not a slide-only architecture.

| Layer | Tech | Role |
|---|---|---|
| **Frontend** | React 19 + TypeScript, Vite | Digest home, watchlist manager, symbol detail — three views, one data shape. |
| **API layer** | FastAPI 0.115, SQLAlchemy 2.0 | Stateless — watchlist CRUD, `GET /digest` as the diff engine, auth, the `last_viewed_at` cursor. |
| **Background workers** | Python (ingestion + signal engine) | Ingestion polls per symbol and applies split/dividend adjustments; Signal Engine computes rolling baselines into scored `ChangeEvent`s. Each independently deployable. |
| **Database** | PostgreSQL, Alembic 1.14 | Users, watchlists, append-only price ticks, symbol baselines, change events. |
| **Cache** | Redis 5.2 | Latest quote per symbol, short-TTL digest cache invalidated on new events, rate-limit tracking. |
| **Reliability** | Timeouts + backoff + circuit breaker | Wraps every external market-data call — one flaky provider can't cascade into an ingestion outage. |

## Why this reads as more than "the obvious watchlist"

| Evaluation axis | How this build answers it |
|---|---|
| **Engineering depth** | Ingestion, detection, and serving are three decoupled, independently retryable processes. |
| **Product interpretation** | The reframe from "current price" to "delta since your last visit" drives every other decision. |
| **Edge cases & resilience** | Staleness, gaps, source conflicts, and splits are named, tested states — not a try/catch afterthought. |
| **Code quality & simplicity** | Change classification is a pure function, unit-testable with synthetic shocks and gaps, no live feed required. |
| **Originality & thoughtfulness** | A per-user, per-symbol cursor — not a live ticker, not a global "since yesterday" — is the one choice everything else follows from. |

The obvious watchlist tells you the price. This one tells you whether you should care — and exactly why.

*(Full technical detail behind each of these calls lives in [`smart-market-watchlist-design.md`](./smart-market-watchlist-design.md) and [`TECH_STACK.md`](./TECH_STACK.md). A designed, presentation-ready version of this pitch: https://claude.ai/code/artifact/67315fdf-e531-4f89-aa73-a3b550efcd85)*
