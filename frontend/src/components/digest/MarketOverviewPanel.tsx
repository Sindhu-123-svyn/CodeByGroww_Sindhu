import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useWatchlistItemsList } from "../../hooks/useWatchlistItems";
import { useSparklinePoints } from "../../hooks/useSparklinePoints";
import { Sparkline } from "./Sparkline";
import { SymbolAvatar } from "../shared/SymbolAvatar";
import { TrendingUpIcon } from "../shared/Icons";
import { dayChangePct, formatPercent, formatPrice } from "../../lib/formatters";
import type { WatchlistItemOut } from "../../api/types";

const MAX_ROWS = 5;

function OverviewRow({ item }: { item: WatchlistItemOut }) {
  const pct = dayChangePct(item.latest_quote);
  const isUp = pct !== null && pct >= 0;
  const points = useSparklinePoints(item.symbol.id);

  return (
    <Link to={`/symbols/${item.symbol.id}`} className="market-overview-row">
      <SymbolAvatar ticker={item.symbol.ticker} size="sm" />
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="mono" style={{ fontWeight: 700, fontSize: 13.5, display: "block", color: "var(--text)" }}>
          {item.symbol.ticker}
        </span>
        {item.latest_quote && (
          <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {formatPrice(item.latest_quote.price)}
          </span>
        )}
      </span>
      <Sparkline points={points} width={54} height={22} />
      {pct !== null && (
        <span
          className="mono"
          style={{ fontSize: 12.5, fontWeight: 700, color: isUp ? "var(--success)" : "var(--danger)", flex: "none" }}
        >
          {formatPercent(pct)}
        </span>
      )}
    </Link>
  );
}

/**
 * Right-rail "Market Overview" — deliberately built from the user's own
 * real watchlist data (top movers by day % change), not fabricated market
 * indices the API has no source for. Reuses the same
 * GET /watchlists/{id}/items endpoint already powering Manage Watchlists.
 */
export function MarketOverviewPanel({ watchlistId }: { watchlistId: string | undefined }) {
  const { data: items, isLoading } = useWatchlistItemsList(watchlistId);

  const topMovers = useMemo(() => {
    return (items ?? [])
      .filter((i) => i.latest_quote)
      .map((i) => ({ item: i, pct: dayChangePct(i.latest_quote) }))
      .filter((x): x is { item: WatchlistItemOut; pct: number } => x.pct !== null)
      .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, MAX_ROWS)
      .map((x) => x.item);
  }, [items]);

  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 6 }}>
        <span className="section-head-icon">
          <TrendingUpIcon size={14} />
        </span>
        <h3>Market Overview</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 6 }}>
        Top movers in this watchlist
      </p>

      {isLoading && <p className="muted">Loading…</p>}
      {!isLoading && topMovers.length === 0 && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Waiting for price data on this watchlist.
        </p>
      )}
      {topMovers.length > 0 && (
        <div>
          {topMovers.map((item) => (
            <OverviewRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
