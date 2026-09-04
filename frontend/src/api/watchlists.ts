import { apiFetch } from "./client";
import type { WatchlistItemOut, WatchlistListOut, WatchlistOut } from "./types";

export function listWatchlists(): Promise<WatchlistListOut[]> {
  return apiFetch<WatchlistListOut[]>("/watchlists");
}

export function createWatchlist(name?: string): Promise<WatchlistOut> {
  return apiFetch<WatchlistOut>("/watchlists", { method: "POST", body: { name } });
}

export function renameWatchlist(watchlistId: string, name: string): Promise<WatchlistOut> {
  return apiFetch<WatchlistOut>(`/watchlists/${watchlistId}`, { method: "PATCH", body: { name } });
}

export function deleteWatchlist(watchlistId: string): Promise<void> {
  return apiFetch<void>(`/watchlists/${watchlistId}`, { method: "DELETE" });
}

export function listItems(watchlistId: string): Promise<WatchlistItemOut[]> {
  return apiFetch<WatchlistItemOut[]>(`/watchlists/${watchlistId}/items`);
}

export function addItem(watchlistId: string, symbolId: string): Promise<WatchlistItemOut> {
  return apiFetch<WatchlistItemOut>(`/watchlists/${watchlistId}/items`, {
    method: "POST",
    body: { symbol_id: symbolId },
  });
}

export function removeItem(watchlistId: string, itemId: string): Promise<void> {
  return apiFetch<void>(`/watchlists/${watchlistId}/items/${itemId}`, { method: "DELETE" });
}

/** Backend requires exactly the current set of item ids for this
 * watchlist, or it 400s (InvalidReorderError) — never a partial list. */
export function reorderItems(
  watchlistId: string,
  orderedItemIds: string[],
): Promise<WatchlistItemOut[]> {
  return apiFetch<WatchlistItemOut[]>(`/watchlists/${watchlistId}/items/reorder`, {
    method: "PATCH",
    body: { ordered_item_ids: orderedItemIds },
  });
}

export function acknowledgeItem(
  watchlistId: string,
  itemId: string,
  asOf?: string,
): Promise<WatchlistItemOut> {
  return apiFetch<WatchlistItemOut>(`/watchlists/${watchlistId}/items/${itemId}/acknowledge`, {
    method: "POST",
    body: { as_of: asOf },
  });
}

export function acknowledgeAll(watchlistId: string, asOf?: string): Promise<WatchlistItemOut[]> {
  return apiFetch<WatchlistItemOut[]>(`/watchlists/${watchlistId}/acknowledge-all`, {
    method: "POST",
    body: { as_of: asOf },
  });
}
