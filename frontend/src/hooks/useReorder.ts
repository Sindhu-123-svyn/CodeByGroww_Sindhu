import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/watchlists";

export function useReorderItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, orderedItemIds }: { watchlistId: string; orderedItemIds: string[] }) =>
      api.reorderItems(watchlistId, orderedItemIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlists"] });
      qc.invalidateQueries({ queryKey: ["watchlist-items"] });
    },
  });
}
