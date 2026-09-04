import { useState } from "react";
import { SeverityBadge } from "../shared/SeverityBadge";
import { ChevronRightIcon } from "../shared/Icons";
import { DigestEntryCard } from "./DigestEntryCard";
import type { DigestEntry, Severity } from "../../api/types";

export function DigestGroup({
  severity,
  entries,
  watchlistId,
  defaultCollapsed = false,
}: {
  severity: Severity;
  entries: DigestEntry[];
  watchlistId: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (entries.length === 0) return null;

  return (
    <section style={{ marginBottom: 18 }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="btn-ghost"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          padding: "6px 4px",
          fontSize: 14,
          borderRadius: 7,
          background: "none",
          width: "100%",
        }}
        aria-expanded={!collapsed}
      >
        <span
          style={{
            color: "var(--text-muted)",
            display: "inline-flex",
            transition: "transform var(--med) var(--ease)",
            transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
          }}
        >
          <ChevronRightIcon size={15} />
        </span>
        <SeverityBadge severity={severity} />
        <span className="muted">{entries.length}</span>
      </button>
      {!collapsed && (
        <div style={{ marginTop: 8 }}>
          {entries.map((entry, i) => (
            <DigestEntryCard key={entry.watchlist_item_id} entry={entry} watchlistId={watchlistId} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
