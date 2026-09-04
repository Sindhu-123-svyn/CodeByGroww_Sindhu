import { useQuery } from "@tanstack/react-query";
import * as api from "../api/digest";
import type { Severity } from "../api/types";

export function useDigest(watchlistId?: string, severityMin?: Severity) {
  return useQuery({
    queryKey: ["digest", watchlistId ?? "all", severityMin ?? "all"],
    queryFn: () => api.getDigest(watchlistId, severityMin),
    // Short staleTime (design: a digest should feel current) without
    // refetching so aggressively it disrupts a user mid-review.
    staleTime: 30_000,
  });
}
