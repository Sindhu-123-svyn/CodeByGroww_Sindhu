import type { ReactNode } from "react";
import { TrendingUpIcon, ZapIcon, BarChartIcon, ShieldAlertIcon } from "./Icons";

const PITCH = [
  { icon: ZapIcon, text: "Instant alerts the moment a price move matters" },
  { icon: BarChartIcon, text: "Volume and trend anomalies, ranked by severity" },
  { icon: ShieldAlertIcon, text: "Data-quality flags so you never chase a bad tick" },
];

/** Shared split-screen frame for Login/Register — a mint gradient brand
 * panel on desktop (hidden on narrow viewports) plus the centered form
 * card, so the two auth pages stay visually identical apart from their
 * fields. An optional `heroImage` (used by the login page only) swaps the
 * flat gradient for a photo with a dark teal/green scrim so the overlaid
 * copy stays readable. */
export function AuthShell({
  title,
  subtitle,
  heroImage,
  children,
}: {
  title: string;
  subtitle: string;
  heroImage?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      <div
        className="auth-brand-panel"
        style={{
          flex: "0 0 42%",
          position: "relative",
          background: heroImage
            ? `linear-gradient(150deg, rgba(3,26,21,0.95) 0%, rgba(6,61,46,0.88) 50%, rgba(2,18,14,0.96) 100%), url(${heroImage}) 68% 45%/cover no-repeat`
            : "linear-gradient(150deg, var(--brand-600) 0%, var(--brand-700) 55%, #063d2e 100%)",
          color: "#fff",
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            top: -160,
            right: -140,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            bottom: -100,
            left: -80,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em", position: "relative" }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "rgba(255,255,255,0.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TrendingUpIcon size={18} />
          </span>
          watchlist
        </div>

        <div style={{ position: "relative" }}>
          <h1 style={{ color: "#fff", fontSize: 30, lineHeight: 1.25, marginBottom: 16, maxWidth: 360 }}>
            Know what moved — and why — before you open the app.
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
            {PITCH.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <Icon size={15} />
                </span>
                <span style={{ fontSize: 14, opacity: 0.92 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ position: "relative", fontSize: 12.5, opacity: 0.65, margin: 0 }}>
          A digest of what changed since your last visit — nothing more.
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-in">
          <div className="auth-brand-mobile" style={{ display: "none", alignItems: "center", gap: 7, fontWeight: 800, fontSize: 19, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 24 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--brand-500)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUpIcon size={17} />
            </span>
            watchlist
          </div>
          <div style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 23, marginBottom: 4 }}>{title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {subtitle}
            </p>
          </div>
          <div className="card" style={{ padding: 26, boxShadow: "var(--shadow-md)" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
