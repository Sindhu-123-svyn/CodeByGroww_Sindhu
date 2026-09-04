import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useSymbolDetail } from "../hooks/useSymbolDetail";
import type { SymbolDetailRange } from "../api/symbols";
import { PriceHistoryChart } from "../components/symbol/PriceHistoryChart";
import { BaselineStatsPanel } from "../components/symbol/BaselineStatsPanel";
import { RecentEventsList } from "../components/symbol/RecentEventsList";
import { CorporateActionsList } from "../components/symbol/CorporateActionsList";
import { FreshnessBadge } from "../components/shared/FreshnessBadge";
import { LoadingState } from "../components/shared/LoadingState";
import { ErrorState } from "../components/shared/ErrorState";
import { ChevronRightIcon } from "../components/shared/Icons";
import { formatPrice } from "../lib/formatters";

const RANGES: SymbolDetailRange[] = ["30d", "90d", "1y"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      <h3 style={{ marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="mono">{symbol.ticker}</span>
            {symbol.status !== "active" && (
              <span className="badge" style={{ color: "var(--neutral)", background: "var(--neutral-bg)", borderColor: "var(--neutral-border)" }}>
                {symbol.status}
              </span>
            )}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {symbol.name} · {symbol.exchange_code}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          {latest_quote && (
            <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", opacity: latest_quote.is_stale ? 0.55 : 1 }}>
              {formatPrice(latest_quote.price)}
            </div>
          )}
          <FreshnessBadge quote={latest_quote} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Price History</h3>
          <div style={{ display: "flex", gap: 4 }}>
            {RANGES.map((r) => (
              <button
                key={r}
                className="btn btn-sm"
                style={{
                  borderColor: r === range ? "var(--brand-500)" : undefined,
                  background: r === range ? "var(--brand-50)" : undefined,
                  color: r === range ? "var(--brand-700)" : undefined,
                  fontWeight: r === range ? 650 : 500,
                }}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <PriceHistoryChart points={price_history} />
        </div>
      </div>

      <Section title="Baseline Stats">
        <BaselineStatsPanel baseline={baseline} />
      </Section>

      <Section title="Recent Activity">
        <RecentEventsList events={recent_events} />
      </Section>

      <Section title="Corporate Actions">
        <CorporateActionsList actions={corporate_actions} />
      </Section>

      <Section title="News">
        <p className="muted">No news integration yet.</p>
      </Section>
    </div>
  );
}
