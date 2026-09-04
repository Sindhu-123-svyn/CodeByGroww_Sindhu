import type { ReactNode } from "react";
import { TrendingUpIcon } from "./Icons";

/** Shared centered-card frame for Login/Register so the two stay visually
 * identical apart from their form fields. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-in">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--brand-500)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0,169,126,0.32)",
              marginBottom: 14,
            }}
          >
            <TrendingUpIcon size={22} />
          </span>
          <h1 style={{ fontSize: 21, marginBottom: 3 }}>{title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {subtitle}
          </p>
        </div>
        <div className="card" style={{ padding: 26, boxShadow: "var(--shadow-md)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
