import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode } from "react";
import { AdminApiError } from "@/lib/adminApi";

function shouldRetry(failureCount: number, error: unknown): boolean {
  // Never retry on auth errors — session is gone
  if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
    return false;
  }
  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});

/** Exposed so the auth layer can wipe all cached data on session expiry. */
export { queryClient };

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
