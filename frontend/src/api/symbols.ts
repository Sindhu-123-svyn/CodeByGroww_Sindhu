import { apiFetch } from "./client";
import type { SymbolDetailOut, SymbolOut } from "./types";

export function searchSymbols(q: string, exchangeCode?: string): Promise<SymbolOut[]> {
  const params = new URLSearchParams({ q });
  if (exchangeCode) params.set("exchange_code", exchangeCode);
  return apiFetch<SymbolOut[]>(`/symbols/search?${params.toString()}`);
}

/** Friendly pre-check layered on top of the DB trigger that remains
 * authoritative on the actual add (design §3.8) — throws ApiError(409) if
 * delisted, ApiError(404) if unknown. */
export function validateSymbol(symbolId: string): Promise<{ valid: true }> {
  return apiFetch<{ valid: true }>(`/symbols/${symbolId}/validate`);
}

export type SymbolDetailRange = "30d" | "90d" | "1y";

export function getSymbolDetail(
  symbolId: string,
  range: SymbolDetailRange = "90d",
): Promise<SymbolDetailOut> {
  return apiFetch<SymbolDetailOut>(`/symbols/${symbolId}?range=${range}`);
}
