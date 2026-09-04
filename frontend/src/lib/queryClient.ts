import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Never retry a real domain error (404/409/429/401) — only retry
        // transient failures (network/5xx), and only a couple of times.
        if (error instanceof ApiError) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
