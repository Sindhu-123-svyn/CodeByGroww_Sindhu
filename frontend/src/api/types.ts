/**
 * Mirrors backend/app/schemas/*.py 1:1 — including exact nullability.
 * Do not "clean up" a field's optionality without checking the source
 * Pydantic model first; a field being nullable there is often load-bearing
 * (e.g. latest_quote is null for a symbol with no ticks yet, design §3.5).
 */

// --- auth.py -----------------------------------------------------------

export interface UserOut {
  id: string;
  email: string;
  created_at: string;
}

export interface UserMeOut extends UserOut {
  max_watchlist_items: number;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- symbol.py -----------------------------------------------------------

export interface SymbolOut {
  id: string;
  ticker: string;
  exchange_code: string;
  name: string;
  status: string; // "active" | "delisted" | "suspended"
}

export interface LatestQuoteOut {
  price: number;
  /** Today's opening print, when the ingested tick carried one — null for
   * older/back-filled ticks. Used to derive a day % change client-side. */
  open: number | null;
  volume: number;
  tick_time: string;
  source: string;
  is_stale: boolean;
}

export interface PriceHistoryPoint extends LatestQuoteOut {}

export type BaselineStatus = "ready" | "building";

export interface BaselineOut {
  avg_volume_20d: number | null;
  stddev_30d: number | null;
  ma_20d: number | null;
  high_52w: number | null;
  low_52w: number | null;
  sample_size: number;
  status: BaselineStatus;
}

export interface CorporateActionOut {
  action_type: string; // "split" | "dividend"
  ratio: number | null;
  amount: number | null;
  effective_date: string;
  applied_at: string | null;
}

export interface RecentEventOut {
  event_type: EventType;
  severity: string;
  score: number;
  event_time: string;
  why: string;
}

export interface SymbolDetailOut {
  symbol: SymbolOut;
  latest_quote: LatestQuoteOut | null;
  baseline: BaselineOut;
  price_history: PriceHistoryPoint[];
  recent_events: RecentEventOut[];
  corporate_actions: CorporateActionOut[];
  news: unknown[];
}

// --- watchlist.py --------------------------------------------------------

export interface WatchlistOut {
  id: string;
  name: string;
  created_at: string;
}

export interface WatchlistListOut extends WatchlistOut {
  item_count: number;
}

export interface WatchlistItemOut {
  id: string;
  symbol: SymbolOut;
  position: number;
  last_viewed_at: string | null;
  added_at: string;
  /** Only populated by GET /watchlists/{id}/items. */
  latest_quote?: LatestQuoteOut | null;
}

// --- digest.py -----------------------------------------------------------

export type EventType =
  | "price_shock"
  | "volume_anomaly"
  | "trend_break"
  | "gap_event"
  | "data_quality_flag";

export type Severity = "major" | "notable" | "minor" | "no_change";

// Fixed order the backend itself ranks by (digest_service.py _SEVERITY_ORDER)
// — never re-derive or re-sort this client-side.
export const SEVERITY_ORDER: Severity[] = ["major", "notable", "minor", "no_change"];

export interface EventOut {
  event_type: EventType;
  severity: string;
  score: number;
  event_time: string;
  why: string;
  details: Record<string, unknown>;
}

export interface DigestEntry {
  watchlist_item_id: string;
  symbol: SymbolOut;
  last_viewed_at: string | null;
  latest_quote: LatestQuoteOut | null;
  baseline_status: BaselineStatus;
  events_since_last_view: EventOut[];
  attention_score: number;
}

export interface DigestOut {
  generated_at: string;
  groups: Record<Severity, DigestEntry[]>;
}
