// Global React Query client configuration.
// - Central place for retry/backoff behavior and cache lifetimes.
// - Shared across all features via QueryClientProvider in app/_layout.tsx.
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import {
  isApiError,
  isNoAccessTokenError,
  isOnboardingRequiredError,
} from "./queryErrors";
import { handleError } from "../errors/errorHandler";

// Create QueryCache with global error handler
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Log React Query errors
    handleError(error, {
      source: "reactQuery",
      queryKey: query.queryKey,
      queryHash: query.queryHash,
    });
  },
});

// Create MutationCache with global error handler
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    // Log React Query mutation errors
    // Note: mutationKey may not be available in all cases
    const mutationKey = mutation.options?.mutationKey || undefined;
    handleError(error, {
      source: "reactQueryMutation",
      ...(mutationKey && { mutationKey }),
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry on these auth/onboarding conditions
        if (isNoAccessTokenError(error) || isOnboardingRequiredError(error)) {
          return false;
        }

        // Avoid extra retries on 401 - already handled in apiFetchWithAuthRetry
        if (isApiError(error) && error.status === 401) {
          return false;
        }

        // Retry a couple of times for other errors (including network).
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        if (isNoAccessTokenError(error) || isOnboardingRequiredError(error)) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});
