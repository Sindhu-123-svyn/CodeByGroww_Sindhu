import type { ReactNode } from "react";
import { formatRelativeTime } from "../../lib/formatters";
import { ArrowUpDownIcon, BarChartIcon, ShieldAlertIcon, WavesIcon, ZapIcon } from "../shared/Icons";
import type { EventType, RecentEventOut } from "../../api/types";

const EVENT_META: Record<EventType, { icon: (s: number) => ReactNode; label: string; color: string }> = {
  price_shock: { icon: (s) => <ZapIcon size={s} />, label: "Price Shock", color: "var(--major)" },
  volume_anomaly: { icon: (s) => <BarChartIcon size={s} />, label: "Volume Anomaly", color: "var(--notable)" },
  trend_break: { icon: (s) => <WavesIcon size={s} />, label: "Trend Break", color: "var(--minor)" },
  gap_event: { icon: (s) => <ArrowUpDownIcon size={s} />, label: "Gap", color: "var(--notable)" },
  data_quality_flag: { icon: (s) => <ShieldAlertIcon size={s} />, label: "Data Quality", color: "var(--neutral)" },
};

/** This is the symbol's full recent event history — distinct from the
 * digest's "events since last view." Labeled "Recent Activity" to avoid
 * conflating the two concepts (frontend plan §6). */
export function RecentEventsList({ events }: { events: RecentEventOut[] }) {
  if (events.length === 0) {
    return <p className="muted">No recent activity recorded.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      {events.map((event, i) => {
        const meta = EVENT_META[event.event_type];
        return (
          <li key={i} className="card" style={{ padding: 12, fontSize: 13.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 650, color: meta.color }}>
                {meta.icon(14)} {meta.label}
              </span>
              <span className="muted" style={{ flex: "none" }}>
                {formatRelativeTime(event.event_time)}
              </span>
            </div>
            {event.why && (
              <div className="muted" style={{ marginTop: 3 }}>
                {event.why}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
