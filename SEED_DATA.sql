-- ============================================================================
-- Smart Market Watchlist — Minimal Seed Data
-- ============================================================================
-- Illustrative, hand-picked values (not live-computed) — enough to build and
-- exercise the API/frontend against real rows without a live market feed.
-- Deliberately covers every feature surface from the design doc:
--   - active + delisted symbols (§3.8 validation)
--   - two data sources with different trust priority (§3.3)
--   - a symbol with too little history yet ("building baseline", §3.5 -> TSLA)
--   - change_events of all 5 types, some BEFORE and some AFTER a watchlist
--     item's last_viewed_at, so the "since last visit" diff (§1.4) has both
--     a "nothing new" case (MSFT) and a "here's what changed" case (AAPL/GOOGL)
--   - a real historical corporate action (TSLA's 2022 3-for-1 split, §3.6)
--   - a data_quality_flag tied to a delisted symbol (§3.1/§3.3)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Reference data
-- ----------------------------------------------------------------------------
INSERT INTO exchanges (code, name, timezone, open_time, close_time) VALUES
  ('NASDAQ', 'Nasdaq', 'America/New_York', '09:30', '16:00'),
  ('NYSE',   'New York Stock Exchange', 'America/New_York', '09:30', '16:00');

INSERT INTO data_sources (code, trust_priority) VALUES
  ('exchange_official', 1),
  ('aggregator_a', 2);

INSERT INTO symbols (ticker, exchange_code, name, status) VALUES
  ('AAPL',  'NASDAQ', 'Apple Inc.',              'active'),
  ('MSFT',  'NASDAQ', 'Microsoft Corporation',   'active'),
  ('TSLA',  'NASDAQ', 'Tesla, Inc.',             'active'),
  ('GOOGL', 'NASDAQ', 'Alphabet Inc.',           'active'),
  ('JPM',   'NYSE',   'JPMorgan Chase & Co.',    'active'),
  ('SIVB',  'NASDAQ', 'SVB Financial Group',     'delisted'), -- exercises the delisted-symbol path
  -- Additional actively-traded symbols so the search typeahead has more
  -- than the 6 illustrative rows above to match against (no price/baseline
  -- history seeded for these — they'll show "building baseline" until the
  -- ingestion worker has picked up a few days of ticks for them).
  ('NVDA',  'NASDAQ', 'NVIDIA Corporation',      'active'),
  ('AMZN',  'NASDAQ', 'Amazon.com, Inc.',        'active'),
  ('META',  'NASDAQ', 'Meta Platforms, Inc.',    'active'),
  ('NFLX',  'NASDAQ', 'Netflix, Inc.',           'active'),
  ('AMD',   'NASDAQ', 'Advanced Micro Devices, Inc.', 'active'),
  ('INTC',  'NASDAQ', 'Intel Corporation',       'active'),
  ('V',     'NYSE',   'Visa Inc.',               'active'),
  ('DIS',   'NYSE',   'The Walt Disney Company', 'active'),
  ('KO',    'NYSE',   'The Coca-Cola Company',   'active');

-- ----------------------------------------------------------------------------
-- Users + watchlists
-- ----------------------------------------------------------------------------
-- password_hash values are placeholders, not real bcrypt hashes
INSERT INTO users (email, password_hash) VALUES
  ('demo1@example.com', 'placeholder_hash_1'),
  ('demo2@example.com', 'placeholder_hash_2');

INSERT INTO watchlists (user_id, name)
  SELECT id, 'Tech Growth' FROM users WHERE email = 'demo1@example.com';
INSERT INTO watchlists (user_id, name)
  SELECT id, 'Diversified' FROM users WHERE email = 'demo2@example.com';

-- demo1 / Tech Growth: AAPL (viewed 2d ago -> will see new activity),
--                       MSFT (viewed 6h ago -> already caught up),
--                       TSLA (never viewed -> brand new item)
INSERT INTO watchlist_items (watchlist_id, symbol_id, position, last_viewed_at, added_at)
  SELECT w.id, s.id, 1, now() - interval '2 days', now() - interval '10 days'
  FROM watchlists w JOIN symbols s ON s.ticker = 'AAPL'
  WHERE w.name = 'Tech Growth';
INSERT INTO watchlist_items (watchlist_id, symbol_id, position, last_viewed_at, added_at)
  SELECT w.id, s.id, 2, now() - interval '6 hours', now() - interval '8 days'
  FROM watchlists w JOIN symbols s ON s.ticker = 'MSFT'
  WHERE w.name = 'Tech Growth';
INSERT INTO watchlist_items (watchlist_id, symbol_id, position, last_viewed_at, added_at)
  SELECT w.id, s.id, 3, NULL, now() - interval '1 day'
  FROM watchlists w JOIN symbols s ON s.ticker = 'TSLA'
  WHERE w.name = 'Tech Growth';

-- demo2 / Diversified: GOOGL (viewed 3d ago -> will see the gap event),
--                       JPM (viewed 1h ago -> already caught up)
INSERT INTO watchlist_items (watchlist_id, symbol_id, position, last_viewed_at, added_at)
  SELECT w.id, s.id, 1, now() - interval '3 days', now() - interval '9 days'
  FROM watchlists w JOIN symbols s ON s.ticker = 'GOOGL'
  WHERE w.name = 'Diversified';
INSERT INTO watchlist_items (watchlist_id, symbol_id, position, last_viewed_at, added_at)
  SELECT w.id, s.id, 2, now() - interval '1 hour', now() - interval '7 days'
  FROM watchlists w JOIN symbols s ON s.ticker = 'JPM'
  WHERE w.name = 'Diversified';

-- ----------------------------------------------------------------------------
-- Price ticks (append-only history; enough per symbol to seed a baseline)
-- ----------------------------------------------------------------------------
-- AAPL: steady week, then a sharp price + volume spike 1 day ago (after
-- demo1's last_viewed_at of 2 days ago) -> shows up in the digest.
INSERT INTO price_ticks (symbol_id, source_code, price, open, volume, tick_time)
SELECT s.id, 'exchange_official', v.price, v.open, v.volume, v.tick_time
FROM symbols s, (VALUES
  (170.00, 169.50,  55000000, now() - interval '9 days'),
  (171.20, 170.00,  52000000, now() - interval '8 days'),
  (169.80, 171.20,  58000000, now() - interval '7 days'),
  (172.40, 169.80,  60000000, now() - interval '6 days'),
  (173.10, 172.40,  51000000, now() - interval '5 days'),
  (174.00, 173.10,  53000000, now() - interval '4 days'),
  (175.30, 174.00,  49000000, now() - interval '3 days'),
  (176.10, 175.30,  54000000, now() - interval '2 days 12 hours'),
  (188.50, 176.10, 142000000, now() - interval '1 day')   -- shock + volume anomaly
) AS v(price, open, volume, tick_time)
WHERE s.ticker = 'AAPL';

-- MSFT: quiet week, most recent tick is still BEFORE last_viewed_at (6h ago)
INSERT INTO price_ticks (symbol_id, source_code, price, open, volume, tick_time)
SELECT s.id, 'exchange_official', v.price, v.open, v.volume, v.tick_time
FROM symbols s, (VALUES
  (410.00, 408.50, 22000000, now() - interval '6 days'),
  (412.30, 410.00, 21000000, now() - interval '5 days'),
  (411.00, 412.30, 23000000, now() - interval '4 days'),  -- crosses 20d MA -> trend_break below
  (413.50, 411.00, 22500000, now() - interval '3 days'),
  (414.20, 413.50, 21800000, now() - interval '2 days'),
  (415.00, 414.20, 22100000, now() - interval '1 day')
) AS v(price, open, volume, tick_time)
WHERE s.ticker = 'MSFT';

-- TSLA: only 3 ticks -> too little history for a baseline yet (§3.5)
INSERT INTO price_ticks (symbol_id, source_code, price, open, volume, tick_time)
SELECT s.id, 'exchange_official', v.price, v.open, v.volume, v.tick_time
FROM symbols s, (VALUES
  (245.00, 242.00, 90000000, now() - interval '2 days'),
  (248.50, 245.00, 95000000, now() - interval '1 day'),
  (250.10, 248.50, 88000000, now() - interval '10 hours')
) AS v(price, open, volume, tick_time)
WHERE s.ticker = 'TSLA';

-- GOOGL: a gap-up open 2 days ago (after demo2's last_viewed_at of 3 days ago)
INSERT INTO price_ticks (symbol_id, source_code, price, open, volume, tick_time)
SELECT s.id, 'exchange_official', v.price, v.open, v.volume, v.tick_time
FROM symbols s, (VALUES
  (138.00, 137.50, 25000000, now() - interval '6 days'),
  (139.20, 138.00, 24500000, now() - interval '5 days'),
  (140.10, 139.20, 26000000, now() - interval '4 days'),
  (136.50, 145.00, 33000000, now() - interval '2 days'),  -- gap open vs prev close 140.10
  (137.80, 136.50, 24000000, now() - interval '1 day')
) AS v(price, open, volume, tick_time)
WHERE s.ticker = 'GOOGL';

-- JPM: quiet week, all ticks before last_viewed_at (1h ago)
INSERT INTO price_ticks (symbol_id, source_code, price, open, volume, tick_time)
SELECT s.id, 'exchange_official', v.price, v.open, v.volume, v.tick_time
FROM symbols s, (VALUES
  (195.00, 194.00, 8000000, now() - interval '3 days'),
  (196.50, 195.00, 8200000, now() - interval '2 days'),
  (197.20, 196.50, 8100000, now() - interval '1 day')
) AS v(price, open, volume, tick_time)
WHERE s.ticker = 'JPM';

-- ----------------------------------------------------------------------------
-- Symbol baselines (what the Signal Engine would have computed from the
-- ticks above, excluding each symbol's most recent/anomalous tick)
-- ----------------------------------------------------------------------------
INSERT INTO symbol_baselines (symbol_id, avg_volume_20d, stddev_30d, ma_20d, high_52w, low_52w, sample_size)
SELECT s.id, v.avg_volume_20d, v.stddev_30d, v.ma_20d, v.high_52w, v.low_52w, v.sample_size
FROM symbols s, (VALUES
  ('AAPL',  54000000::numeric, 2.30::numeric, 172.74::numeric, 199.62::numeric, 164.08::numeric, 8),
  ('MSFT',  22150000,          1.85,          412.67,          430.82,          385.10,          6),
  ('GOOGL', 26500000,          1.40,          138.70,          155.20,          121.46,          5),
  ('JPM',    8100000,          0.95,          196.23,          201.34,          178.50,          3)
) AS v(ticker, avg_volume_20d, stddev_30d, ma_20d, high_52w, low_52w, sample_size)
WHERE s.ticker = v.ticker;

-- TSLA deliberately gets a baseline row with NULLs + low sample_size,
-- so the API can render "building baseline — insights available after N days"
INSERT INTO symbol_baselines (symbol_id, sample_size)
SELECT id, 3 FROM symbols WHERE ticker = 'TSLA';

-- ----------------------------------------------------------------------------
-- Change events — one of each type, mixing before/after last_viewed_at
-- ----------------------------------------------------------------------------
INSERT INTO change_events (symbol_id, event_type, event_time, severity, score, details)
SELECT id, 'price_shock', now() - interval '1 day', 'major', 9.8,
  '{"z_score": 5.39, "delta": 12.40, "reason": "price moved 5.4 std-devs above 30d baseline"}'::jsonb
FROM symbols WHERE ticker = 'AAPL';

INSERT INTO change_events (symbol_id, event_type, event_time, severity, score, details)
SELECT id, 'volume_anomaly', now() - interval '1 day', 'notable', 6.5,
  '{"volume": 142000000, "avg_20d_volume": 54000000, "ratio": 2.63}'::jsonb
FROM symbols WHERE ticker = 'AAPL';

INSERT INTO change_events (symbol_id, event_type, event_time, severity, score, details)
SELECT id, 'gap_event', now() - interval '2 days', 'notable', 5.2,
  '{"open": 145.00, "prev_close": 140.10, "gap_pct": 3.5}'::jsonb
FROM symbols WHERE ticker = 'GOOGL';

-- MSFT's event is BEFORE last_viewed_at (6h ago) -> already seen, should NOT
-- appear in a fresh digest for demo1. Proves the diff-since-last-visit logic.
INSERT INTO change_events (symbol_id, event_type, event_time, severity, score, details)
SELECT id, 'trend_break', now() - interval '5 days', 'minor', 2.1,
  '{"crossed": "20d_ma", "direction": "up"}'::jsonb
FROM symbols WHERE ticker = 'MSFT';

-- Delisted symbol still carries a data-quality trail (never silently dropped)
INSERT INTO change_events (symbol_id, event_type, event_time, severity, score, details)
SELECT id, 'data_quality_flag', now() - interval '30 days', 'major', 10.0,
  '{"reason": "symbol delisted, ingestion halted"}'::jsonb
FROM symbols WHERE ticker = 'SIVB';

-- ----------------------------------------------------------------------------
-- Corporate actions — real historical example (TSLA 3-for-1 split, Aug 2022)
-- ----------------------------------------------------------------------------
INSERT INTO corporate_actions (symbol_id, action_type, ratio, effective_date, applied_at)
SELECT id, 'split', 3.0, DATE '2022-08-25', TIMESTAMPTZ '2022-08-25 00:00:00+00'
FROM symbols WHERE ticker = 'TSLA';

COMMIT;
