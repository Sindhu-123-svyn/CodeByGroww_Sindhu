import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "../api/symbols";

/** Debounced (~300ms) so we don't fire a search request per keystroke. */
export function useSymbolSearch(query: string, exchangeCode?: string) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  return useQuery({
    queryKey: ["symbol-search", debounced, exchangeCode ?? "all"],
    queryFn: () => api.searchSymbols(debounced, exchangeCode),
    enabled: debounced.trim().length > 0,
  });
}
