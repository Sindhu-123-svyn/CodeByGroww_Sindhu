import type { Severity } from "../../api/types";

const CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string }> = {
  major: { label: "Major", color: "var(--major)", bg: "var(--major-bg)", border: "var(--major-border)" },
  notable: { label: "Notable", color: "var(--notable)", bg: "var(--notable-bg)", border: "var(--notable-border)" },
  minor: { label: "Minor", color: "var(--minor)", bg: "var(--minor-bg)", border: "var(--minor-border)" },
  no_change: { label: "No change", color: "var(--neutral)", bg: "var(--neutral-bg)", border: "var(--neutral-border)" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = CONFIG[severity];
  return (
    <span className="badge" style={{ color: c.color, background: c.bg, borderColor: c.border }}>
      <span className="dot" />
      {c.label}
    </span>
  );
}
