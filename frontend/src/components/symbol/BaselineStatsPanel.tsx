import { BuildingBaselineNotice } from "../shared/BuildingBaselineNotice";
import { formatPrice, formatVolume } from "../../lib/formatters";
import type { BaselineOut } from "../../api/types";

const STAT_LABELS: { key: keyof BaselineOut; label: string; format: (v: number) => string }[] = [
  { key: "ma_20d", label: "20-day MA", format: formatPrice },
  { key: "stddev_30d", label: "30-day Std Dev", format: formatPrice },
  { key: "avg_volume_20d", label: "Avg 20d Volume", format: formatVolume },
  { key: "high_52w", label: "52-week High", format: formatPrice },
  { key: "low_52w", label: "52-week Low", format: formatPrice },
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
      {STAT_LABELS.map(({ key, label, format }) => {
        const value = baseline[key];
        return (
          <div key={key} className="card" style={{ padding: 14 }}>
            <div className="muted" style={{ marginBottom: 3 }}>
              {label}
            </div>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {typeof value === "number" ? format(value) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
