# Smart Market Watchlist — CODE 2026

## 1. Problem Statement

Build a smart market watchlist that helps users not just **track** stocks, but quickly **understand what has meaningfully changed** since they last checked, and what deserves their attention now.

At minimum, users should be able to:

- Create and manage a watchlist
- View latest market information
- Return later and see what has changed

This is a full end-to-end build — both frontend and backend are required.

### Open design decisions (ours to make)

There is no prescribed UI, feature set, or architecture. We are expected to define:

- What counts as a **meaningful change**
- What information to **surface**
- How **state persists** across sessions and devices
- How to handle **stale, delayed, or conflicting data**
- How the system **scales** for larger watchlists and more users
- Where to keep things **simple vs. add complexity**

> The brief explicitly asks us not to build "the obvious watchlist" — but the version we believe *should* exist, and to be ready to justify why.

---

## 2. Evaluation Policy

Submissions will be judged on the following dimensions:

| Dimension | What it means |
|---|---|
| **Engineering Depth** | Architecture, correctness, reliability and scalability. |
| **Product & Problem Interpretation** | Understanding beyond the obvious brief. |
| **Edge Cases & Resilience** | Failures, race conditions, integrity and unreliable dependencies. |
| **Code Quality & Simplicity** | Maintainability without unnecessary over-engineering. |
| **Originality & Thoughtfulness** | Independent choices and a considered approach. |

**Implication for scope:** every major decision below should be traceable back to one of these five dimensions — if a feature doesn't strengthen engineering depth, product thinking, resilience, code quality, or originality, it's a candidate to cut.

---

## 3. What We're Building

### 3.1 Core Concept
Instead of a live price ticker, the app is framed as a **digest**: every time a user returns, they see a diff of what changed since their *last visit to that specific symbol* — not just raw price movement.

### 3.2 Functional Requirements

**Watchlist Management**
- Add / remove / reorder symbols
- Persisted server-side (not local storage) so it's consistent across devices

**Market Data**
- Latest price, volume, and daily change per symbol
- Data freshness clearly indicated (source + "as of" timestamp)

**Change Detection ("Meaningful Change")**
- Composite **Attention Score** per symbol, combining:
  - Price move normalized against the symbol's own historical volatility (z-score, not flat %)
  - Volume anomaly vs. trailing average
  - Structural events (52-week high/low, gap open, support/resistance break)
  - Trend reversal after a consistent run
  - Correlation with news/earnings events
- Score bucketed into **Major / Notable / Minor / No Change**

**Digest View (Home)**
- Grouped by significance, not a flat table
- Each entry shows: delta, sparkline of the gap period, and *why* it was flagged
- Per-symbol "last seen" anchor — not one global timestamp — so a daily-checked stock and a weekly-checked stock are each diffed correctly

**Symbol Detail View**
- Full chart, stats, and news on drill-down only (kept out of the digest to avoid noise)

### 3.3 Non-Functional Requirements

**State & Persistence**
- Watchlist + per-symbol "last seen" state stored server-side (Postgres)
- Works identically across sessions and devices

**Stale / Delayed / Conflicting Data**
- Every snapshot tagged with source and fetch time
- Fallback to a secondary data source if primary is stale beyond a threshold
- Conflicting sources are surfaced as "uncertain," never silently resolved
- Poll frequency adapts to market hours (fast during open, slow after-hours)

**Scalability**
- Market data ingested **once per unique symbol**, shared across all users (not per-user polling)
- Signal computation (volatility, anomalies) is per-symbol and shared
- Stateless API layer, horizontally scalable; all state in Postgres/Redis

**Where We're Keeping It Simple**
- Statistical (z-score) anomaly detection over ML — explainable and fast to build
- Polling over a full streaming pipeline
- Postgres over a dedicated time-series database
- A single free-tier market data API for this scope

### 3.4 High-Level Architecture

- **Ingestion Worker** — polls market data per unique symbol, writes snapshots
- **Signal Engine** — scheduled job computing baseline stats + attention scores
- **API Layer** — watchlist CRUD, `GET /digest` (diff engine), symbol detail
- **Cache** — Redis, latest quotes + rate-limit tracking
- **Database** — Postgres for users, watchlists, snapshots, baseline stats
- **Frontend** — digest-first UI, with management and detail views

---

## 4. Why This Approach

The brief's key phrase is "what has meaningfully changed since they last checked" — that is treated as the core product, not a bolt-on feature. Anchoring change detection to per-symbol, per-user last-seen state (rather than a live ticker or a global timestamp) is the central original decision this build is built around, and it directly drives the data model, the API shape, and the scaling strategy.
