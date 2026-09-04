import type { ReactNode } from "react";
import { InboxIcon } from "./Icons";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className="card fade-in"
      style={{
        textAlign: "center",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        border: "1px dashed var(--border-strong)",
        background: "var(--gray-25)",
        boxShadow: "none",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "var(--brand-50)",
          color: "var(--brand-600)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        {icon ?? <InboxIcon size={19} />}
      </div>
      <p style={{ color: "var(--text)", fontWeight: 600, margin: 0 }}>{title}</p>
      {description && (
        <p className="muted" style={{ maxWidth: 340 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}
