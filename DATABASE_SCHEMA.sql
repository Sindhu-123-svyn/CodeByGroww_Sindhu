-- ============================================================================
-- Smart Market Watchlist — Database Schema (PostgreSQL)
-- ============================================================================
-- Derived from README.md and smart-market-watchlist-design.md.
-- Section refs below (§1.x, §2.x, §3.x) point back to the design doc so every
-- table/constraint is traceable to a stated requirement.
--
-- Core entities (design doc §1.2):
--   User, Watchlist, WatchlistItem, PriceTick, SymbolBaseline, ChangeEvent
-- Supporting entities added to satisfy stated edge cases (§3):
--   Exchange, Symbol, DataSource, CorporateAction
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 TEXT NOT NULL UNIQUE,
    password_hash         TEXT NOT NULL,             -- minimal auth, not full OAuth/SSO (out of scope, §6)
    max_watchlist_items   INTEGER NOT NULL DEFAULT 100, -- per-user rate limit (§3.8)
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- REFERENCE DATA: exchanges, symbols, data sources
-- ============================================================================

-- Exchange calendars, so gap/off-hours detection is market-aware (§3.4)
CREATE TABLE exchanges (
    code        TEXT PRIMARY KEY,      -- e.g. 'NASDAQ', 'NYSE'
    name        TEXT NOT NULL,
    timezone    TEXT NOT NULL,
    open_time   TIME NOT NULL,
    close_time  TIME NOT NULL
);

CREATE TYPE symbol_status AS ENUM ('active', 'delisted', 'suspended');

-- Master symbol list. Backs "reject unknown/delisted tickers on add" (§3.8)
CREATE TABLE symbols (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker        TEXT NOT NULL,
    exchange_code TEXT NOT NULL REFERENCES exchanges(code),
    name          TEXT NOT NULL,
    status        symbol_status NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ticker, exchange_code)
);

-- Trust ranking for conflicting-source resolution (§3.3)
CREATE TABLE data_sources (
    code            TEXT PRIMARY KEY,   -- e.g. 'exchange_official', 'aggregator_a'
    trust_priority  SMALLINT NOT NULL   -- lower value = more trusted
);

-- ============================================================================
-- WATCHLISTS + ITEMS
-- ============================================================================
CREATE TABLE watchlists (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'My Watchlist',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- One row per symbol tracked in a watchlist. last_viewed_at is the per-item
-- cursor the whole product is built around (§1.4) — diffs are computed as
-- change_events WHERE event_time > last_viewed_at, per (user, item), not
-- a global "since yesterday" timestamp.
CREATE TABLE watchlist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id    UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol_id       UUID NOT NULL REFERENCES symbols(id),
    position        INTEGER NOT NULL,        -- supports add/remove/reorder
    last_viewed_at  TIMESTAMPTZ,             -- NULL = never viewed / brand new
    added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (watchlist_id, symbol_id)
);

CREATE INDEX idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_symbol    ON watchlist_items(symbol_id);

-- Reject unknown/delisted symbols on add (§3.8)
CREATE OR REPLACE FUNCTION validate_symbol_active()
RETURNS TRIGGER AS $$
DECLARE
    v_status symbol_status;
BEGIN
    SELECT status INTO v_status FROM symbols WHERE id = NEW.symbol_id;
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'unknown symbol_id %', NEW.symbol_id;
    ELSIF v_status = 'delisted' THEN
        RAISE EXCEPTION 'symbol % is delisted and cannot be added to a watchlist', NEW.symbol_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_symbol_active
BEFORE INSERT ON watchlist_items
FOR EACH ROW EXECUTE FUNCTION validate_symbol_active();

-- Per-user watchlist-size rate limit (§3.8)
CREATE OR REPLACE FUNCTION enforce_watchlist_item_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_max     INTEGER;
    v_count   INTEGER;
BEGIN
    SELECT w.user_id INTO v_user_id FROM watchlists w WHERE w.id = NEW.watchlist_id;
    SELECT max_watchlist_items INTO v_max FROM users WHERE id = v_user_id;
    SELECT count(*) INTO v_count
      FROM watchlist_items wi JOIN watchlists w ON w.id = wi.watchlist_id
      WHERE w.user_id = v_user_id;
    IF v_count >= v_max THEN
        RAISE EXCEPTION 'watchlist item limit (%) exceeded for user %', v_max, v_user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_watchlist_limit
BEFORE INSERT ON watchlist_items
FOR EACH ROW EXECUTE FUNCTION enforce_watchlist_item_limit();

-- last_viewed_at only ever advances, never rewinds, under concurrent writes
-- from two devices (§3.7 race-condition rule: "last-write-wins on advance only")
CREATE OR REPLACE FUNCTION enforce_last_viewed_at_forward()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.last_viewed_at IS NOT NULL AND NEW.last_viewed_at < OLD.last_viewed_at THEN
        NEW.last_viewed_at := OLD.last_viewed_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_last_viewed_forward
BEFORE UPDATE OF last_viewed_at ON watchlist_items
FOR EACH ROW EXECUTE FUNCTION enforce_last_viewed_at_forward();

-- ============================================================================
-- PRICE TICKS — append-only raw ingestion (§2.2)
-- ============================================================================
-- Ingested once per unique symbol (shared across all users, §2.4), never
-- mutated, so baseline recomputation/backfills/audits are trivial and a bad
-- tick can be quarantined without corrupting history.
CREATE TABLE price_ticks (
    id           BIGSERIAL PRIMARY KEY,
    symbol_id    UUID NOT NULL REFERENCES symbols(id),
    source_code  TEXT NOT NULL REFERENCES data_sources(code),
    price        NUMERIC(18,6) NOT NULL,
    open         NUMERIC(18,6),
    volume       BIGINT NOT NULL,
    tick_time    TIMESTAMPTZ NOT NULL,             -- market timestamp of the data point
    fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),-- when the ingestion worker retrieved it
    is_stale     BOOLEAN NOT NULL DEFAULT false     -- past staleness threshold (§3.1); excluded from detection
);

CREATE INDEX idx_price_ticks_symbol_time ON price_ticks(symbol_id, tick_time DESC);

-- Enforce append-only: no in-place mutation or deletion of history
CREATE OR REPLACE FUNCTION block_price_tick_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'price_ticks is append-only; % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_tick_mutation
BEFORE UPDATE OR DELETE ON price_ticks
FOR EACH ROW EXECUTE FUNCTION block_price_tick_mutation();

-- ============================================================================
-- CORPORATE ACTIONS — split/dividend adjustment (§3.6)
-- ============================================================================
-- Applied by the ingestion layer before ticks reach detection, so mechanical
-- price jumps (e.g. a 2-for-1 split) are never mistaken for a real Price Shock.
CREATE TYPE corporate_action_type AS ENUM ('split', 'dividend');

CREATE TABLE corporate_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol_id       UUID NOT NULL REFERENCES symbols(id),
    action_type     corporate_action_type NOT NULL,
    ratio           NUMERIC(10,6),  -- e.g. 2.0 for a 2-for-1 split
    amount          NUMERIC(18,6),  -- dividend amount, if applicable
    effective_date  DATE NOT NULL,
    applied_at      TIMESTAMPTZ,    -- set once ingestion has applied the adjustment factor
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_corporate_actions_symbol ON corporate_actions(symbol_id, effective_date);

-- ============================================================================
-- SYMBOL BASELINES — rolling stats used to judge "meaningful" (§1.2 / §2.1)
-- ============================================================================
CREATE TABLE symbol_baselines (
    symbol_id       UUID PRIMARY KEY REFERENCES symbols(id),
    avg_volume_20d  NUMERIC(18,2),
    stddev_30d      NUMERIC(18,6),  -- denominator for price z-score
    ma_20d          NUMERIC(18,6),
    high_52w        NUMERIC(18,6),
    low_52w         NUMERIC(18,6),
    sample_size     INTEGER NOT NULL DEFAULT 0, -- < N days => "building baseline" state (§3.5)
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CHANGE EVENTS — computed, classified, scored deviations (§1.2 / §1.3 / §2.2)
-- ============================================================================
-- This is the object the UI actually renders. Generation is a pure function
-- of (new tick, symbol baseline) and is idempotent on (symbol, type, time),
-- so a crashed/re-run detection job never double-emits the same event.
CREATE TYPE change_event_type AS ENUM (
    'price_shock',       -- |Δprice| / rolling_30d_stddev > 2.0
    'volume_anomaly',    -- volume > 2x avg_20d_volume
    'trend_break',       -- crosses 52w high/low or 20d MA
    'gap_event',         -- overnight/pre-market move vs prev close
    'data_quality_flag'  -- stale / source conflict / missing tick — a trust signal, not a market one
);

CREATE TYPE change_severity AS ENUM ('major', 'notable', 'minor', 'no_change');

CREATE TABLE change_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol_id    UUID NOT NULL REFERENCES symbols(id),
    event_type   change_event_type NOT NULL,
    event_time   TIMESTAMPTZ NOT NULL,   -- when the underlying market event occurred
    severity     change_severity NOT NULL,
    score        NUMERIC(6,3) NOT NULL,  -- contribution to the composite Attention Score
    details      JSONB NOT NULL DEFAULT '{}', -- e.g. {"z_score": 2.4, "reason": "..."} — explainability, never hidden (§4)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (symbol_id, event_type, event_time)  -- idempotency key (§2.2)
);

-- Powers GET /digest: events for a symbol since a per-item last_viewed_at cursor
CREATE INDEX idx_change_events_symbol_time ON change_events(symbol_id, event_time DESC);

-- ============================================================================
-- Notes on things deliberately NOT modeled here (§6, out of scope for v1):
--   - Sessions/OAuth tables: auth is minimal (email + password_hash) by design
--   - Any queue/broker tables: ingestion + detection run as scheduled jobs,
--     not a message-queue architecture, for v1
--   - Redis (latest-quote cache, digest cache, rate-limit counters) is a
--     separate cache layer, intentionally not part of this relational schema
-- ============================================================================
