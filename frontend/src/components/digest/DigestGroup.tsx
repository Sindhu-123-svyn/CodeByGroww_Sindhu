import { useState, type ReactNode } from "react";
import { ChevronRightIcon, AlertTriangleIcon, BarChartIcon, WavesIcon, CheckCircleIcon } from "../shared/Icons";
import { DigestEntryCard } from "./DigestEntryCard";
import type { DigestEntry, Severity } from "../../api/types";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

const SEVERITY_META: Record<
  Severity,
  { title: string; subtitle: (n: number) => string; icon: (s: number) => ReactNode; color: string; bg: string }
> = {
  major: {
    title: "Major Alerts",
    subtitle: (n) => `${plural(n, "stock")} with significant updates`,
    icon: (s) => <AlertTriangleIcon size={s} />,
    color: "var(--major)",
    bg: "var(--major-bg)",
  },
  notable: {
    title: "Notable Alerts",
    subtitle: (n) => `${plural(n, "stock")} worth a look`,
    icon: (s) => <BarChartIcon size={s} />,
    color: "var(--notable)",
    bg: "var(--notable-bg)",
  },
  minor: {
    title: "Minor Changes",
    subtitle: (n) => `${plural(n, "stock")} with small moves`,
    icon: (s) => <WavesIcon size={s} />,
    color: "var(--minor)",
    bg: "var(--minor-bg)",
  },
  no_change: {
    title: "No Change",
    subtitle: (n) => `${plural(n, "stock")} unchanged since your last visit`,
    icon: (s) => <CheckCircleIcon size={s} />,
    color: "var(--neutral)",
    bg: "var(--neutral-bg)",
  },
};

export function DigestGroup({
  severity,
  entries,
  watchlistId,
  defaultCollapsed = false,
  action,
}: {
  severity: Severity;
  entries: DigestEntry[];
  watchlistId: string;
  defaultCollapsed?: boolean;
  /** Rendered on the right of this group's header — used to place the
   * page's single "Mark all as read" action beside the first non-empty
   * group, matching where it visually reads best, without implying a
   * per-severity acknowledge endpoint that doesn't exist. */
  action?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (entries.length === 0) return null;

  const meta = SEVERITY_META[severity];

  return (
    <section style={{ marginBottom: 20 }}>
      <div className="digest-section-head">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="digest-section-head-btn"
          aria-expanded={!collapsed}
        >
          <span
            className="digest-section-icon"
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.icon(15)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="digest-section-title">{meta.title}</span>
            <span className="digest-section-subtitle">{meta.subtitle(entries.length)}</span>
          </span>
          <span
            className="digest-section-chevron"
            style={{ transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
          >
            <ChevronRightIcon size={15} />
          </span>
        </button>
        {action && <div style={{ flex: "none" }}>{action}</div>}
      </div>
      {!collapsed && (
        <div style={{ marginTop: 10 }}>
          {entries.map((entry, i) => (
            <DigestEntryCard key={entry.watchlist_item_id} entry={entry} watchlistId={watchlistId} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
