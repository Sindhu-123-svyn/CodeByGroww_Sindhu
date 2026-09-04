import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/watchlists";

/** Both hooks below are ONLY ever called from an explicit user action (a
 * button's onClick) — never from a useEffect / on-mount / on-view hook.
 * That distinction is the entire point of design §1.4's "since last
 * visit" mechanic: viewing the digest must never itself mark it seen. */

export function useAcknowledgeItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, itemId, asOf }: { watchlistId: string; itemId: string; asOf?: string }) =>
      api.acknowledgeItem(watchlistId, itemId, asOf),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["digest"] }),
  });
}

export function useAcknowledgeAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, asOf }: { watchlistId: string; asOf?: string }) =>
      api.acknowledgeAll(watchlistId, asOf),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["digest"] }),
  });
}
