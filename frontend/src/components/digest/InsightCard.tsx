import { GaugeIcon } from "../shared/Icons";

const TIPS = {
  major: "A Major alert means a price move well outside this stock's own historical volatility — a z-score outlier, not just a flat percent move.",
  default: "Good decisions come from good information — every signal here is scored against the stock's own baseline, not a generic threshold.",
} as const;

/** Purely educational/decorative — a gradient card (no external photo),
 * with copy about how the product's own Attention Score actually works.
 * No invented market data or numbers. */
export function InsightCard({ hasMajor }: { hasMajor: boolean }) {
  return (
    <div className="insight-card">
      <span className="insight-card-icon">
        <GaugeIcon size={16} />
      </span>
      <p className="insight-card-text">{hasMajor ? TIPS.major : TIPS.default}</p>
    </div>
  );
}
