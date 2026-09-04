/**
 * Deliberately cheap: the digest endpoint doesn't return a price series
 * (only Symbol Detail does), so this renders only when points are already
 * available in the query cache — never triggers its own per-card fetch.
 * The full chart is one click away in Symbol Detail (design: charts are
 * "kept out of the digest to avoid noise").
 */
export function Sparkline({ points }: { points: number[] | undefined }) {
  if (!points || points.length < 2) return null;

  const width = 80;
  const height = 24;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const trendUp = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        points={coords}
        fill="none"
        stroke={trendUp ? "var(--success)" : "var(--danger)"}
        strokeWidth={1.5}
      />
    </svg>
  );
}
