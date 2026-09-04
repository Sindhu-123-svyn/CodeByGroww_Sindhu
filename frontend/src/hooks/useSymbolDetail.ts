import { useQuery } from "@tanstack/react-query";
import * as api from "../api/symbols";
import type { SymbolDetailRange } from "../api/symbols";

export function useSymbolDetail(symbolId: string | undefined, range: SymbolDetailRange) {
  return useQuery({
    queryKey: ["symbol-detail", symbolId, range],
    queryFn: () => api.getSymbolDetail(symbolId as string, range),
    enabled: Boolean(symbolId),
  });
}
