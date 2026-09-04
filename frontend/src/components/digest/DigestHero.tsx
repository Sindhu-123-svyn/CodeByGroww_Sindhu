import { useAuth } from "../../auth/AuthContext";
import { SeverityBadge } from "../shared/SeverityBadge";
import { BarChartIcon } from "../shared/Icons";
import { SEVERITY_ORDER, type DigestEntry, type Severity } from "../../api/types";

/** Same severity-count strip the page always had — just relocated into
 * the hero. Built entirely from the digest response already on the page,
 * no new data. */
function SeverityCounts({ groups }: { groups: Record<Severity, DigestEntry[]> }) {
  const withCounts = SEVERITY_ORDER.filter((s) => s !== "no_change" && (groups[s]?.length ?? 0) > 0);
  if (withCounts.length === 0) return null;
  return (
    <>
      {withCounts.map((s) => (
        <span key={s} className="hero-pill hero-pill-count">
          <SeverityBadge severity={s} />
          <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>
            × {groups[s].length}
          </span>
        </span>
      ))}
    </>
  );
}

/** A large, brand-themed hero banner behind the digest header — purely
 * decorative background (CSS/SVG, no external photo asset) so there's
 * nothing to license or fetch. Every piece of text/data inside it is
 * real: the existing severity counts, the active watchlist's real name,
 * and the logged-in user's own email. */
export function DigestHero({
  groups,
  watchlistName,
}: {
  groups?: Record<Severity, DigestEntry[]>;
  watchlistName?: string;
}) {
  const { user } = useAuth();
  const greeting = user?.email?.split("@")[0];

  return (
    <div className="digest-hero-bleed">
      <div className="digest-hero">
        <svg
          className="digest-hero-skyline"
          viewBox="0 0 1200 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="40" y="140" width="70" height="160" />
          <rect x="120" y="90" width="55" height="210" />
          <rect x="185" y="160" width="45" height="140" />
          <rect x="240" y="60" width="80" height="240" />
          <rect x="330" y="120" width="50" height="180" />
          <rect x="390" y="40" width="65" height="260" />
          <rect x="465" y="150" width="55" height="150" />
          <rect x="530" y="100" width="90" height="200" />
          <rect x="630" y="170" width="48" height="130" />
          <rect x="690" y="70" width="60" height="230" />
          <rect x="760" y="130" width="52" height="170" />
          <rect x="820" y="50" width="75" height="250" />
          <rect x="905" y="160" width="48" height="140" />
          <rect x="965" y="95" width="60" height="205" />
          <rect x="1035" y="145" width="50" height="155" />
          <rect x="1095" y="75" width="65" height="225" />
        </svg>
        <svg
          className="digest-hero-candles"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="0,150 60,140 120,155 180,110 240,120 300,90 360,100 420,70 480,85 540,55 600,65 660,40 720,58 780,35 840,48 900,25 960,42 1020,20 1080,32 1140,15 1200,28"
            fill="none"
            stroke="var(--brand-400)"
            strokeWidth="2.5"
          />
          {[80, 160, 260, 340, 440, 520, 620, 700, 800, 880, 980, 1060, 1160].map((x, i) => (
            <rect
              key={x}
              x={x - 4}
              y={70 + ((i * 37) % 90)}
              width="8"
              height={14 + ((i * 23) % 26)}
              fill={i % 3 === 0 ? "#ff6b6b" : "var(--brand-400)"}
              opacity="0.85"
            />
          ))}
        </svg>
        <div className="digest-hero-scrim" />

        <div className="digest-hero-content">
          <div style={{ minWidth: 0 }}>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,0.72)" }}>
              Since your last visit
            </span>
            <h1 className="digest-hero-title">Market Digest</h1>
            <p className="digest-hero-subtitle">Quick summary of the stocks you're tracking. Stay informed, stay ahead.</p>
            {groups && (
              <div className="digest-hero-pills">
                <SeverityCounts groups={groups} />
                {watchlistName && <span className="hero-pill hero-pill-accent">{watchlistName}</span>}
                {greeting && <span className="hero-pill">Hi, {greeting}</span>}
              </div>
            )}
          </div>

          <div className="digest-hero-glass">
            <span className="digest-hero-glass-icon">
              <BarChartIcon size={18} />
            </span>
            <div>
              <strong style={{ display: "block", fontSize: 14.5 }}>Markets move fast.</strong>
              <span style={{ fontSize: 13.5, opacity: 0.85 }}>Stay informed.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
