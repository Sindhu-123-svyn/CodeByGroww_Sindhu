import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { WatchlistItemRow } from "./WatchlistItemRow";
import type { WatchlistItemOut } from "../../api/types";

export function ReorderableList({
  items,
  onRemove,
  onReorder,
}: {
  items: WatchlistItemOut[];
  onRemove: (itemId: string) => void;
  onReorder: (orderedItemIds: string[]) => void;
}) {
  // Local optimistic order — reconciled against the server's response;
  // reverted on failure (frontend plan §4).
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => setLocalItems(items), [items]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(reordered);
    onReorder(reordered.map((i) => i.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {localItems.map((item) => (
            <WatchlistItemRow key={item.id} item={item} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
