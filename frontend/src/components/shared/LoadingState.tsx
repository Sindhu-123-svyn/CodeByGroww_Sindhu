export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-muted)", fontSize: 13.5, padding: "6px 0" }}
    >
      <span className="spinner" />
      {label}
    </div>
  );
}
