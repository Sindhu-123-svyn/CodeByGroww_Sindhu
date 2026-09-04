import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "react-router-dom";
import { GripIcon, TrashIcon } from "../shared/Icons";
import { PriceChange } from "../shared/PriceChange";
import { SymbolAvatar } from "../shared/SymbolAvatar";
import type { WatchlistItemOut } from "../../api/types";

export function WatchlistItemRow({
  item,
  onRemove,
}: {
  item: WatchlistItemOut;
  onRemove: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      className="card card-interactive"
      style={{
        marginBottom: 6,
        padding: "10px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? "var(--shadow-md)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", color: "var(--gray-400)", display: "flex", touchAction: "none", flex: "none" }}
          aria-label="Drag to reorder"
        >
          <GripIcon size={16} />
        </span>
        <Link to={`/symbols/${item.symbol.id}`} style={{ flex: "none", display: "flex" }}>
          <SymbolAvatar ticker={item.symbol.ticker} size="sm" />
        </Link>
        <span style={{ minWidth: 0, overflow: "hidden" }}>
          <Link to={`/symbols/${item.symbol.id}`} className="mono" style={{ fontWeight: 700, color: "var(--text)" }}>
            {item.symbol.ticker}
          </Link>{" "}
          <span className="muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.symbol.name}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PriceChange quote={item.latest_quote} />
        <button className="btn btn-ghost btn-icon" onClick={() => onRemove(item.id)} title="Remove" aria-label="Remove">
          <TrashIcon size={14} />
        </button>
      </div>
    </li>
  );
}
