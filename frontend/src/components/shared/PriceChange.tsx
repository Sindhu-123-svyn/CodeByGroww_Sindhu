import { formatPercent, formatPrice } from "../../lib/formatters";
import type { LatestQuoteOut } from "../../api/types";

/** Price + day change (vs today's open) — the compact "how's it doing"
 * glance used on watchlist rows and the digest. Green/up or red/down, same
 * convention as the symbol detail price chart. Renders a muted dash when
 * there's no quote yet (symbol just added, ingestion hasn't run) and just
 * the price, no change pill, when a quote exists but has no `open` to
 * diff against (older back-filled ticks). */
export function PriceChange({ quote }: { quote: LatestQuoteOut | null | undefined }) {
  if (!quote) {
    return <span className="muted mono">—</span>;
  }

  const pct = quote.open ? ((quote.price - quote.open) / quote.open) * 100 : null;
  const isUp = pct !== null && pct >= 0;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span className="mono" style={{ fontWeight: 700, fontSize: 14, opacity: quote.is_stale ? 0.55 : 1 }}>
        {formatPrice(quote.price)}
      </span>
      {pct !== null && (
        <span
          className="mono"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: isUp ? "var(--success)" : "var(--danger)",
            background: isUp ? "var(--success-bg)" : "var(--danger-bg)",
            padding: "2px 6px",
            borderRadius: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            lineHeight: 1.4,
          }}
        >
          {isUp ? "▲" : "▼"} {formatPercent(pct)}
        </span>
      )}
    </span>
  );
}
