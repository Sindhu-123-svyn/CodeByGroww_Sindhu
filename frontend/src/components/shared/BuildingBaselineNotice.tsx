import { LayersIcon } from "./Icons";

/** Design §3.5: a symbol with too little history must show this explicit
 * state, never a fabricated "no meaningful change." */
export function BuildingBaselineNotice() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--brand-50)",
        color: "var(--brand-700)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <LayersIcon size={14} />
      Building baseline — insights available after a bit more history accumulates.
    </div>
  );
}
