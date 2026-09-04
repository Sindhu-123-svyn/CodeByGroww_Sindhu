import { type ReactNode, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSymbolDetail } from "../hooks/useSymbolDetail";
import { useWatchlists } from "../hooks/useWatchlists";
import { useWatchlistItemsList } from "../hooks/useWatchlistItems";
import type { SymbolDetailRange } from "../api/symbols";
import { PriceHistoryChart } from "../components/symbol/PriceHistoryChart";
import { BaselineStatsPanel } from "../components/symbol/BaselineStatsPanel";
import { RecentEventsList } from "../components/symbol/RecentEventsList";
import { CorporateActionsList } from "../components/symbol/CorporateActionsList";
import { FreshnessBadge } from "../components/shared/FreshnessBadge";
import { PriceChange } from "../components/shared/PriceChange";
import { LoadingState } from "../components/shared/LoadingState";
import { ErrorState } from "../components/shared/ErrorState";
import { EmptyState } from "../components/shared/EmptyState";
import { SymbolAvatar } from "../components/shared/SymbolAvatar";
import {
  ChevronRightIcon,
  GaugeIcon,
  ActivityIcon,
  NewspaperIcon,
  StarIcon,
  BarChartIcon,
  BuildingIcon,
} from "../components/shared/Icons";
import { formatPrice } from "../lib/formatters";

const RANGES: SymbolDetailRange[] = ["30d", "90d", "1y"];

function SectionHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="section-head">
      <span className="section-head-icon">{icon}</span>
      <h3>{title}</h3>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <SectionHead icon={icon} title={title} />
      {children}
    </div>
  );
}

/** Real "related stocks" — pulled from the user's own watchlists rather
 * than fabricated data, since the API has no symbol-similarity endpoint.
 * Shows other symbols the user is already tracking, excluding this one. */
function RelatedStocks({ excludeSymbolId }: { excludeSymbolId: string }) {
  const { data: watchlists } = useWatchlists();
  const firstWithItems = watchlists?.find((w) => w.item_count > 1) ?? watchlists?.[0];
  const { data: items } = useWatchlistItemsList(firstWithItems?.id);

  const related = useMemo(
    () => (items ?? []).filter((i) => i.symbol.id !== excludeSymbolId).slice(0, 4),
    [items, excludeSymbolId],
  );

  if (related.length === 0) return null;

  return (
    <Section title="From your watchlist" icon={<StarIcon size={14} />}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {related.map((item) => (
          <Link key={item.id} to={`/symbols/${item.symbol.id}`} className="related-card">
            <SymbolAvatar ticker={item.symbol.ticker} size="sm" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="mono" style={{ fontWeight: 700, fontSize: 13.5 }}>
                {item.symbol.ticker}
              </div>
              <div className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                {item.symbol.name}
              </div>
            </div>
            {item.latest_quote && (
              <div style={{ flex: "none", textAlign: "right" }}>
                <PriceChange quote={item.latest_quote} />
              </div>
            )}
          </Link>
        ))}
      </div>
    </Section>
  );
}

export function SymbolDetailPage() {
  const { symbolId } = useParams<{ symbolId: string }>();
  const [range, setRange] = useState<SymbolDetailRange>("90d");
  const { data, isLoading, error, refetch } = useSymbolDetail(symbolId, range);

  if (isLoading) return <LoadingState label="Loading symbol…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { symbol, latest_quote, baseline, price_history, recent_events, corporate_actions } = data;

  return (
    <div className="fade-in">
      <Link to="/" className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 3, marginBottom: 14 }}>
        <ChevronRightIcon size={13} style={{ transform: "rotate(180deg)" }} /> Back to digest
      </Link>

      <div className="hero-card">
        <div className="hero-banner" />
        <div className="hero-body">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <SymbolAvatar ticker={symbol.ticker} size={62} className="hero-avatar" />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <h1 className="mono" style={{ margin: 0 }}>
                  {symbol.ticker}
                </h1>
                <span className="chip">{symbol.exchange_code}</span>
                {symbol.status !== "active" && (
                  <span
                    className="badge"
                    style={{ color: "var(--neutral)", background: "var(--neutral-bg)", borderColor: "var(--neutral-border)" }}
                  >
                    {symbol.status}
                  </span>
                )}
              </div>
              <p className="muted" style={{ margin: "2px 0 0" }}>
                {symbol.name}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {latest_quote && (
              <div
                className="mono"
                style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", opacity: latest_quote.is_stale ? 0.55 : 1 }}
              >
                {formatPrice(latest_quote.price)}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", marginTop: 2, flexWrap: "wrap" }}>
              <PriceChange quote={latest_quote} />
              <FreshnessBadge quote={latest_quote} />
            </div>
          </div>
        </div>
      </div>

      <Section title="Key Stats" icon={<GaugeIcon size={14} />}>
        <BaselineStatsPanel baseline={baseline} />
      </Section>

      <div className="card" style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div className="section-head" style={{ marginBottom: 0 }}>
            <span className="section-head-icon">
              <BarChartIcon size={14} />
            </span>
            <h3>Price History</h3>
          </div>
          <div className="tab-row">
            {RANGES.map((r) => (
              <button key={r} className={`tab ${r === range ? "tab-active" : ""}`} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PriceHistoryChart points={price_history} />
        </div>
      </div>

      <Section title="Recent Activity" icon={<ActivityIcon size={14} />}>
        <RecentEventsList events={recent_events} />
      </Section>

      <Section title="Corporate Actions" icon={<BuildingIcon size={14} />}>
        <CorporateActionsList actions={corporate_actions} />
      </Section>

      <Section title="News" icon={<NewspaperIcon size={14} />}>
        <EmptyState
          icon={<NewspaperIcon size={18} />}
          title="No news integration yet"
          description="Headlines for this symbol will appear here once a news feed is connected."
        />
      </Section>

      {symbolId && <RelatedStocks excludeSymbolId={symbolId} />}
    </div>
  );
}
