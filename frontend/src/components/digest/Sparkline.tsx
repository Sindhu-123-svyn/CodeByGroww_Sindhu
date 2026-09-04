import { useId } from "react";

/**
 * Deliberately cheap: the digest endpoint doesn't return a price series
 * (only Symbol Detail does), so this renders only when points are already
 * available in the query cache — never triggers its own per-card fetch.
 * The full chart is one click away in Symbol Detail (design: charts are
 * "kept out of the digest to avoid noise").
 *
 * Callers now warm that cache themselves (see useSparklinePoints) — real
 * 30d price history, deduped across every card/panel showing the same
 * symbol via react-query's cache, never a fabricated shape.
 */
export function Sparkline({
  points,
  width = 80,
  height = 28,
}: {
  points: number[] | undefined;
  width?: number;
  height?: number;
}) {
  const uid = useId();

  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });

  const trendUp = points[points.length - 1] >= points[0];
  const color = trendUp ? "var(--success)" : "var(--danger)";
  const lineStr = coords.join(" ");
  const areaStr = `0,${height} ${lineStr} ${width},${height}`;
  const gradientId = `spark-fill-${uid}`;

  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaStr} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={lineStr}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
