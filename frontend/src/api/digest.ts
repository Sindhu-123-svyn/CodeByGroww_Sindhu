import { apiFetch } from "./client";
import type { DigestOut, Severity } from "./types";

export function getDigest(watchlistId?: string, severityMin?: Severity): Promise<DigestOut> {
  const params = new URLSearchParams();
  if (watchlistId) params.set("watchlist_id", watchlistId);
  if (severityMin) params.set("severity_min", severityMin);
  const qs = params.toString();
  return apiFetch<DigestOut>(`/digest${qs ? `?${qs}` : ""}`);
}
