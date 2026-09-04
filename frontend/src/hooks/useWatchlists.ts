import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/watchlists";

const KEY = ["watchlists"] as const;

export function useWatchlists() {
  return useQuery({ queryKey: KEY, queryFn: api.listWatchlists });
}

export function useCreateWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => api.createWatchlist(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRenameWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, name }: { watchlistId: string; name: string }) =>
      api.renameWatchlist(watchlistId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (watchlistId: string) => api.deleteWatchlist(watchlistId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
