-- Adds more actively-traded symbols to an ALREADY-RUNNING database.
--
-- SEED_DATA.sql only runs automatically on a fresh, empty Postgres volume
-- (docker-entrypoint-initdb.d applies once, on first init — see
-- docker-compose.yml). Editing SEED_DATA.sql alone will not add rows to a
-- database that already exists. Run this script directly instead:
--
--   docker compose exec -T db psql -U postgres -d smart_market_watchlist \
--     < backend/scripts/add_symbols.sql
--
-- (or, without Docker: psql "$DATABASE_URL" -f backend/scripts/add_symbols.sql)
--
-- Safe to re-run — ON CONFLICT (ticker, exchange_code) skips rows that are
-- already there instead of erroring.

INSERT INTO symbols (ticker, exchange_code, name, status) VALUES
  ('NVDA', 'NASDAQ', 'NVIDIA Corporation',           'active'),
  ('AMZN', 'NASDAQ', 'Amazon.com, Inc.',             'active'),
  ('META', 'NASDAQ', 'Meta Platforms, Inc.',         'active'),
  ('NFLX', 'NASDAQ', 'Netflix, Inc.',                'active'),
  ('AMD',  'NASDAQ', 'Advanced Micro Devices, Inc.', 'active'),
  ('INTC', 'NASDAQ', 'Intel Corporation',            'active'),
  ('V',    'NYSE',   'Visa Inc.',                    'active'),
  ('DIS',  'NYSE',   'The Walt Disney Company',      'active'),
  ('KO',   'NYSE',   'The Coca-Cola Company',        'active')
ON CONFLICT (ticker, exchange_code) DO NOTHING;
