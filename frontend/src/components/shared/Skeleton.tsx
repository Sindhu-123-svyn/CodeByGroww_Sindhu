export function Skeleton({ width, height = 14, radius }: { width: string | number; height?: number; radius?: number }) {
  return (
    <span
      className="skeleton"
      style={{
        display: "inline-block",
        width,
        height,
        borderRadius: radius ?? (height >= 32 ? 10 : 6),
      }}
    />
  );
}

/** Mimics the shape of a DigestEntryCard while its data loads — avoids the
 * layout "pop" of a spinner being replaced by a very different-shaped card. */
export function DigestCardSkeleton() {
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <Skeleton width={30} height={30} radius={10} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton width={64} height={16} />
            <Skeleton width={140} height={12} />
          </div>
        </div>
        <Skeleton width={92} height={30} radius={7} />
      </div>
    </div>
  );
}

export function DigestPageSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
        <Skeleton width={90} height={12} />
        <Skeleton width={220} height={30} />
      </div>
      {[0, 1, 2].map((i) => (
        <DigestCardSkeleton key={i} />
      ))}
    </div>
  );
}
