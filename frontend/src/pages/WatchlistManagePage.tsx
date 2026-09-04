import { useState } from "react";
import {
  useCreateWatchlist,
  useDeleteWatchlist,
  useRenameWatchlist,
  useWatchlists,
} from "../hooks/useWatchlists";
import { useWatchlistItemsList, useAddItem, useRemoveItem } from "../hooks/useWatchlistItems";
import { useReorderItems } from "../hooks/useReorder";
import { SymbolSearchTypeahead } from "../components/watchlist/SymbolSearchTypeahead";
import { ReorderableList } from "../components/watchlist/ReorderableList";
import { LoadingState } from "../components/shared/LoadingState";
import { ErrorState } from "../components/shared/ErrorState";
import { EmptyState } from "../components/shared/EmptyState";
import { InboxIcon, PencilIcon, PlusIcon, TrashIcon } from "../components/shared/Icons";
import { ApiError } from "../api/errors";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../lib/confirm";
import { useToast } from "../lib/toast";

export function WatchlistManagePage() {
  const { user } = useAuth();
  const { data: watchlists, isLoading, error, refetch } = useWatchlists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const createWatchlist = useCreateWatchlist();
  const renameWatchlist = useRenameWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const addItem = useAddItem();
  const removeItem = useRemoveItem();
  const reorderItems = useReorderItems();

  const activeId = selectedId ?? watchlists?.[0]?.id;
  const active = watchlists?.find((w) => w.id === activeId);
  const itemsQuery = useWatchlistItemsList(activeId);

  if (isLoading) return <LoadingState label="Loading watchlists…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  async function handleCreate() {
    await createWatchlist.mutateAsync(newName || undefined);
    setNewName("");
    toast.success("Watchlist created");
  }

  async function handleAdd(symbolId: string) {
    if (!activeId) return;
    setAddError(null);
    try {
      await addItem.mutateAsync({ watchlistId: activeId, symbolId });
      toast.success("Symbol added");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setAddError(
          `You've reached your limit of ${user?.max_watchlist_items ?? "the maximum"} symbols on this watchlist.`,
        );
      } else if (err instanceof ApiError && err.status === 409) {
        setAddError("That symbol is already on this watchlist.");
      } else if (err instanceof ApiError) {
        setAddError(err.message);
      }
    }
  }

  async function handleDelete() {
    if (!activeId || !active) return;
    const ok = await confirm({
      title: `Delete "${active.name}"?`,
      description: `This removes ${active.item_count} symbol${active.item_count === 1 ? "" : "s"} from the watchlist. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await deleteWatchlist.mutateAsync(activeId);
    setSelectedId(null);
    toast.success("Watchlist deleted");
  }

  return (
    <div>
      <span className="eyebrow">Your watchlists</span>
      <h1 style={{ marginTop: 2, marginBottom: 18 }}>Manage Watchlists</h1>

      <div className="card" style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="New watchlist name (optional)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          style={{ flex: "1 1 220px" }}
        />
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={createWatchlist.isPending}
          style={{ flex: "none" }}
        >
          {createWatchlist.isPending ? <span className="spinner" /> : <PlusIcon size={14} />}
          New watchlist
        </button>
      </div>

      {!watchlists || watchlists.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={19} />}
          title="No watchlists yet"
          description="Create one above to get started."
        />
      ) : (
        <>
          <div className="tab-row" style={{ marginBottom: 20 }}>
            {watchlists.map((wl) => (
              <button
                key={wl.id}
                className={`tab ${wl.id === activeId ? "tab-active" : ""}`}
                onClick={() => setSelectedId(wl.id)}
              >
                {wl.name}
                <span className="tab-count">{wl.item_count}</span>
              </button>
            ))}
          </div>

          {active && (
            <WatchlistDetail
              watchlist={active}
              onRename={(name) => {
                renameWatchlist.mutate({ watchlistId: active.id, name });
                toast.success("Watchlist renamed");
              }}
              onDelete={handleDelete}
              itemsQuery={itemsQuery}
              onRemoveItem={(itemId) => removeItem.mutate({ watchlistId: active.id, itemId })}
              onReorder={(orderedIds) =>
                reorderItems.mutate(
                  { watchlistId: active.id, orderedItemIds: orderedIds },
                  {
                    // Revert the optimistic order on failure (frontend
                    // plan §7 "Reorder failure") — refetching restores the
                    // last-known-good server order, which ReorderableList
                    // picks back up via its items-prop effect.
                    onError: () => {
                      itemsQuery.refetch();
                      toast.error("Reorder failed — restored previous order.");
                    },
                  },
                )
              }
              onAdd={handleAdd}
              addError={addError}
            />
          )}
        </>
      )}
    </div>
  );
}

function WatchlistDetail({
  watchlist,
  onRename,
  onDelete,
  itemsQuery,
  onRemoveItem,
  onReorder,
  onAdd,
  addError,
}: {
  watchlist: { id: string; name: string; item_count: number };
  onRename: (name: string) => void;
  onDelete: () => void;
  itemsQuery: ReturnType<typeof useWatchlistItemsList>;
  onRemoveItem: (itemId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onAdd: (symbolId: string) => void;
  addError: string | null;
}) {
  const { data: items, isLoading, error, refetch } = itemsQuery;
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(watchlist.name);

  function saveName() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== watchlist.name) onRename(trimmed);
    setIsEditingName(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        {isEditingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setDraftName(watchlist.name);
                setIsEditingName(false);
              }
            }}
            style={{ maxWidth: 260, fontWeight: 700 }}
          />
        ) : (
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            {watchlist.name}
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                setDraftName(watchlist.name);
                setIsEditingName(true);
              }}
              title="Rename"
              aria-label="Rename watchlist"
            >
              <PencilIcon size={13} />
            </button>
          </h2>
        )}
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          <TrashIcon size={13} /> Delete
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Add a symbol</h3>
        <SymbolSearchTypeahead onAdd={onAdd} addError={addError} />
      </div>

      {isLoading && <LoadingState label="Loading items…" />}
      {error && <ErrorState error={error} onRetry={refetch} />}
      {items && items.length === 0 && (
        <EmptyState
          icon={<InboxIcon size={19} />}
          title="This watchlist is empty"
          description="Search above to add a symbol."
        />
      )}
      {items && items.length > 0 && (
        <ReorderableList items={items} onRemove={onRemoveItem} onReorder={onReorder} />
      )}
    </div>
  );
}
