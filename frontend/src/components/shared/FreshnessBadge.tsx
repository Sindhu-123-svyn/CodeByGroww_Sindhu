import { formatRelativeTime } from "../../lib/formatters";
import { ClockIcon } from "./Icons";
import type { LatestQuoteOut } from "../../api/types";

/** Shared between the digest and symbol detail views so staleness is
 * treated identically everywhere a price appears (design §3.1: a stale
 * price must never be shown as if live). */
export function FreshnessBadge({ quote }: { quote: LatestQuoteOut | null }) {
  if (!quote) {
    return (
      <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <ClockIcon size={12} /> Waiting for first price update
      </span>
    );
  }

  const label = formatRelativeTime(quote.tick_time);

  if (quote.is_stale) {
    return (
      <span
        className="badge"
        style={{ color: "var(--stale)", background: "var(--gray-100)", borderColor: "var(--gray-200)" }}
        title={quote.tick_time}
      >
        <ClockIcon size={11} /> stale · {label}
      </span>
    );
  }

  return (
    <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 5 }} title={quote.tick_time}>
      <span className="dot" style={{ color: "var(--success)" }} /> as of {label}
    </span>
  );
}
