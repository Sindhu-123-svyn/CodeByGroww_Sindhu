const PALETTE = [
  "var(--avatar-1)",
  "var(--avatar-2)",
  "var(--avatar-3)",
  "var(--avatar-4)",
  "var(--avatar-5)",
  "var(--avatar-6)",
  "var(--avatar-7)",
  "var(--avatar-8)",
];

/** Deterministic hash so a given ticker always renders the same color —
 * the API has no real company-logo feed, so this stands in as a
 * consistent "brand mark" everywhere a symbol appears. */
function colorFor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(ticker: string): string {
  const clean = ticker.replace(/[^A-Za-z0-9]/g, "");
  return clean.slice(0, 2).toUpperCase() || "?";
}

const SIZES = { sm: 30, md: 38, lg: 62 } as const;

export function SymbolAvatar({
  ticker,
  size = "md",
  className = "",
}: {
  ticker: string;
  size?: keyof typeof SIZES | number;
  className?: string;
}) {
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <span
      className={`symbol-avatar ${className}`}
      style={{
        width: px,
        height: px,
        background: colorFor(ticker),
        fontSize: Math.max(11, Math.round(px * 0.36)),
      }}
      aria-hidden="true"
    >
      {initialsFor(ticker)}
    </span>
  );
}
