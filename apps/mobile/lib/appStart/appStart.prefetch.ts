// lib/appStart/appStart.prefetch.ts
// Prefetch fixtures based on current auth state.
// Called after bootstrap completes and React state has updated.

import type { QueryClient } from "@tanstack/react-query";
import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import { isNetworkError } from "@/lib/query/queryErrors";
import type { AppStartError, AppStartStatus } from "./appStart.types";
import {
  fetchUpcomingFixtures,
  fixturesKeys,
} from "@/domains/fixtures";

/**
 * Prefetch initial data based on current auth state.
 * Called after bootstrap completes and React state has updated.
 */
export async function prefetchInitialData(
  queryClient: QueryClient,
  auth: AuthContextValue,
  setStatus: (status: AppStartStatus) => void,
  setError: (error: AppStartError | null) => void
): Promise<void> {
  const { status, user } = auth;
  console.log(
    "AppStart: prefetchInitialData - status:",
    status,
    "user:",
    user ? "exists" : "null"
  );

  if (status === "guest") {
    // Guest: no prefetch needed, just mark ready for login screen
    console.log("AppStart: guest, skipping prefetch");
    setStatus("ready");
    console.log("AppStart: ready (guest - will show login)");
  } else if (status === "authed") {
    // Authed: check user state
    if (!user) {
      // User is null (network issue during /auth/me) - soft loading, allow UI to open
      console.log("AppStart: authed but user is null (soft loading), marking ready");
      setStatus("ready");
      console.log("AppStart: ready (authed but user not loaded yet - soft loading)");
      return;
    }

    if (user.onboardingRequired) {
      // Onboarding required: skip prefetch, mark ready for onboarding flow
      console.log("AppStart: onboarding required, skipping prefetch");
      setStatus("ready");
      console.log("AppStart: ready (onboarding required)");
    } else {
      // Onboarding complete: prefetch protected fixtures
      console.log("AppStart: prefetch protected start");
      try {
        const params = { page: 1, perPage: 20 };
        const queryKey = fixturesKeys.upcoming(params);

        await queryClient.prefetchQuery({
          queryKey,
          queryFn: () => fetchUpcomingFixtures(params),
          meta: { scope: "user" },
        });

        console.log("AppStart: prefetch protected end");
        setStatus("ready");
        console.log("AppStart: ready (authed onboarded)");
      } catch (error) {
        console.log("AppStart: prefetch protected error", error);
        handlePrefetchError(error, setStatus, setError);
      }
    }
  } else if (status === "loading") {
    // Status is still loading - bootstrap might be retrying or network issue
    // Do not turn this into error automatically, stay in booting state
    console.log("AppStart: status still loading, staying in booting state");
    // Don't change status - keep it as "booting" so the effect can retry
  } else {
    // Unknown status - should not happen
    console.log("AppStart: unknown status:", status);
    setStatus("error");
    setError({
      message: "Unexpected auth state. Please retry.",
      kind: "unknown",
    });
  }
}

/**
 * Handle prefetch errors
 */
function handlePrefetchError(
  error: unknown,
  setStatus: (status: AppStartStatus) => void,
  setError: (error: AppStartError | null) => void
): void {
  const appError: AppStartError = isNetworkError(error)
    ? {
        message: "Network error. Please check your connection and retry.",
        kind: "network",
      }
    : {
        message: "Failed to load fixtures. Please retry.",
        kind: "unknown",
      };

  setStatus("error");
  setError(appError);
  console.log(`AppStart: error kind=${appError.kind}`);
}
