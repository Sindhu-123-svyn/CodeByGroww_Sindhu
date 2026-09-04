import { useSymbolDetail } from "./useSymbolDetail";

/**
 * Real price-history-derived sparkline points for one symbol.
 *
 * Reuses the exact same react-query cache key Symbol Detail's "30d" range
 * uses (["symbol-detail", symbolId, "30d"]) — every card/panel on the
 * Digest page showing the same symbol shares one network request, and
 * clicking through to Symbol Detail afterward starts from a warm cache.
 * Renders nothing until the API actually returns history — never a
 * fabricated shape (Sparkline itself no-ops on <2 points).
 */
export function useSparklinePoints(symbolId: string | undefined): number[] | undefined {
  const { data } = useSymbolDetail(symbolId, "30d");
  return data?.price_history.map((p) => p.price);
}
