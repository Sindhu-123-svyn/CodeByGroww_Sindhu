import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/watchlists";

export function useWatchlistItemsList(watchlistId: string | undefined) {
  return useQuery({
    queryKey: ["watchlist-items", watchlistId],
    queryFn: () => api.listItems(watchlistId as string),
    enabled: Boolean(watchlistId),
  });
}

/** Invalidates both the watchlist list (item_count changes) and the
 * digest (a symbol_subscribers change on the backend means the digest
 * cache may already be stale too — refetching here keeps the client in
 * sync regardless of server-side cache timing). */
function useInvalidateAfterItemChange() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["watchlists"] });
    qc.invalidateQueries({ queryKey: ["watchlist-items"] });
    qc.invalidateQueries({ queryKey: ["digest"] });
  };
}

export function useAddItem() {
  const invalidate = useInvalidateAfterItemChange();
  return useMutation({
    mutationFn: ({ watchlistId, symbolId }: { watchlistId: string; symbolId: string }) =>
      api.addItem(watchlistId, symbolId),
    onSuccess: invalidate,
  });
}

export function useRemoveItem() {
  const invalidate = useInvalidateAfterItemChange();
  return useMutation({
    mutationFn: ({ watchlistId, itemId }: { watchlistId: string; itemId: string }) =>
      api.removeItem(watchlistId, itemId),
    onSuccess: invalidate,
  });
}
