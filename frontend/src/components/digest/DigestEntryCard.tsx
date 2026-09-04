import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkline } from "./Sparkline";
import { BuildingBaselineNotice } from "../shared/BuildingBaselineNotice";
import { FreshnessBadge } from "../shared/FreshnessBadge";
import { PriceChange } from "../shared/PriceChange";
import { SymbolAvatar } from "../shared/SymbolAvatar";
import { AcknowledgeButton } from "./AcknowledgeButton";
import { useSparklinePoints } from "../../hooks/useSparklinePoints";
import {
  ArrowUpDownIcon,
  BarChartIcon,
  ShieldAlertIcon,
  WavesIcon,
  ZapIcon,
} from "../shared/Icons";
import type { DigestEntry, EventType, Severity } from "../../api/types";

const EVENT_META: Record<EventType, { icon: (s: number) => ReactNode; label: string; color: string }> = {
  price_shock: { icon: (s) => <ZapIcon size={s} />, label: "Price Shock", color: "var(--major)" },
  volume_anomaly: { icon: (s) => <BarChartIcon size={s} />, label: "Volume Anomaly", color: "var(--notable)" },
  trend_break: { icon: (s) => <WavesIcon size={s} />, label: "Trend Break", color: "var(--minor)" },
  gap_event: { icon: (s) => <ArrowUpDownIcon size={s} />, label: "Gap", color: "var(--notable)" },
  // Deliberately distinct from the market-signal types above — this is a
  // trust signal, not a price signal (design §1.3).
  data_quality_flag: { icon: (s) => <ShieldAlertIcon size={s} />, label: "Data Quality", color: "var(--neutral)" },
};

const ACCENT: Record<Severity, string> = {
  major: "var(--major)",
  notable: "var(--notable)",
  minor: "var(--minor)",
  no_change: "transparent",
};

export function DigestEntryCard({
  entry,
  watchlistId,
  index = 0,
}: {
  entry: DigestEntry;
  watchlistId: string;
  index?: number;
}) {
  const topSeverity: Severity =
    (entry.events_since_last_view.find((e) => e.severity === "major") && "major") ||
    (entry.events_since_last_view.find((e) => e.severity === "notable") && "notable") ||
    (entry.events_since_last_view.find((e) => e.severity === "minor") && "minor") ||
    "no_change";

  const isTrustFlagOnly =
    entry.events_since_last_view.length > 0 &&
    entry.events_since_last_view.every((e) => e.event_type === "data_quality_flag");

  const sparklinePoints = useSparklinePoints(entry.symbol.id);

  return (
    <div
      className="card card-interactive fade-in digest-entry-card"
      style={{
        marginBottom: 12,
        borderLeft: `3px solid ${ACCENT[topSeverity]}`,
        animationDelay: `${Math.min(index, 8) * 30}ms`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
          <Link to={`/symbols/${entry.symbol.id}`} style={{ flex: "none", marginTop: 1 }}>
            <SymbolAvatar ticker={entry.symbol.ticker} size={40} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
              <Link to={`/symbols/${entry.symbol.id}`} className="mono" style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                {entry.symbol.ticker}
              </Link>
              <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.symbol.name}
              </span>
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <PriceChange quote={entry.latest_quote} />
              <FreshnessBadge quote={entry.latest_quote} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
          <Sparkline points={sparklinePoints} />
          <AcknowledgeButton watchlistId={watchlistId} itemId={entry.watchlist_item_id} />
        </div>
      </div>

      {entry.baseline_status === "building" && (
        <div style={{ marginTop: 12 }}>
          <BuildingBaselineNotice />
        </div>
      )}

      {entry.events_since_last_view.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12, marginBottom: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          {entry.events_since_last_view.map((event, i) => {
            const meta = EVENT_META[event.event_type];
            const isTrustFlag = event.event_type === "data_quality_flag";
            return (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13,
                  padding: "7px 10px",
                  borderRadius: 8,
                  background: isTrustFlag ? "var(--neutral-bg)" : "var(--gray-50)",
                  color: isTrustFlag ? "var(--neutral)" : "var(--text-secondary)",
                }}
              >
                <span style={{ color: meta.color, marginTop: 1, flex: "none" }} title={meta.label}>
                  {meta.icon(14)}
                </span>
                <span>{event.why || meta.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      {isTrustFlagOnly && (
        <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
          Only a data-quality note — not a price movement.
        </p>
      )}
    </div>
  );
}
