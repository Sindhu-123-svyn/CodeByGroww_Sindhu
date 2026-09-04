import { BuildingBaselineNotice } from "../shared/BuildingBaselineNotice";
import { formatPrice, formatVolume } from "../../lib/formatters";
import { GaugeIcon, ActivityIcon, BarChartIcon, TrendingUpIcon, TrendingDownIcon } from "../shared/Icons";
import type { ReactNode } from "react";
import type { BaselineOut } from "../../api/types";

const STAT_LABELS: {
  key: keyof BaselineOut;
  label: string;
  format: (v: number) => string;
  icon: (s: number) => ReactNode;
  color: string;
}[] = [
  { key: "ma_20d", label: "20-day MA", format: formatPrice, icon: (s) => <GaugeIcon size={s} />, color: "var(--minor)" },
  { key: "stddev_30d", label: "30-day Std Dev", format: formatPrice, icon: (s) => <ActivityIcon size={s} />, color: "var(--notable)" },
  { key: "avg_volume_20d", label: "Avg 20d Volume", format: formatVolume, icon: (s) => <BarChartIcon size={s} />, color: "var(--brand-600)" },
  { key: "high_52w", label: "52-week High", format: formatPrice, icon: (s) => <TrendingUpIcon size={s} />, color: "var(--success)" },
  { key: "low_52w", label: "52-week Low", format: formatPrice, icon: (s) => <TrendingDownIcon size={s} />, color: "var(--danger)" },
];

export function BaselineStatsPanel({ baseline }: { baseline: BaselineOut }) {
  if (baseline.status === "building") {
    return (
      <div>
        <BuildingBaselineNotice />
        <p className="muted" style={{ marginTop: 8 }}>
          {baseline.sample_size} data point{baseline.sample_size === 1 ? "" : "s"} collected so far.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {STAT_LABELS.map(({ key, label, format, icon, color }) => {
        const value = baseline[key];
        return (
          <div key={key} className="stat-tile">
            <span className="stat-tile-icon" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
              {icon(14)}
            </span>
            <div>
              <div className="stat-tile-label">{label}</div>
              <div className="stat-tile-value mono">{typeof value === "number" ? format(value) : "—"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
