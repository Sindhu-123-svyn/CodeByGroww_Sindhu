export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/** "+1.24%" / "-0.87%" — always signed so up/down reads at a glance. */
export function formatPercent(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/** Day % change vs today's open — the one formula every price/change UI
 * (PriceChange, Market Overview, …) derives from, so they never drift
 * out of sync with each other. Null when there's no `open` to diff
 * against (older back-filled ticks) — never fabricated. */
export function dayChangePct(quote: { price: number; open: number | null } | null | undefined): number | null {
  if (!quote || !quote.open) return null;
  return ((quote.price - quote.open) / quote.open) * 100;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return String(volume);
}

/** "as of 5m ago" / "as of 3h ago" / "as of 2d ago" freshness text — used
 * for both live and stale quotes so a viewer always knows how current a
 * price is (design §3.1: freshness "clearly indicated"). */
export function formatRelativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function formatDate(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
