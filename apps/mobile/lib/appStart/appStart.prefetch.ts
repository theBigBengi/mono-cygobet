// lib/appStart/appStart.prefetch.ts
// Prefetch data based on current auth state.
// Called after bootstrap completes and React state has updated.
// Prefetch happens in background - app shows immediately.

import type { QueryClient } from "@tanstack/react-query";
import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import type { AppStartError, AppStartStatus } from "./appStart.types";
import {
  fetchUpcomingFixtures,
  fixturesKeys,
} from "@/domains/fixtures";
import { fetchLeagues } from "@/domains/leagues/leagues.api";
import { leaguesKeys } from "@/domains/leagues/leagues.keys";
import { fetchTeams } from "@/domains/teams/teams.api";
import { teamsKeys } from "@/domains/teams/teams.keys";
import { fetchMyGroups } from "@/domains/groups/groups.api";
import { groupsKeys } from "@/domains/groups/groups.keys";

/**
 * Prefetch initial data based on current auth state.
 * Called after bootstrap completes and React state has updated.
 * Marks app as ready immediately and performs prefetch in background.
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
      // Onboarding complete: mark ready immediately, prefetch in background
      console.log("AppStart: marking ready immediately, starting background prefetch");
      setStatus("ready");
      console.log("AppStart: ready (authed onboarded)");
      
      // Prefetch in background (fire-and-forget)
      prefetchInBackground(queryClient);
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
 * Prefetch data in background (fire-and-forget).
 * Performs prefetch of leagues, teams, groups, and fixtures in parallel.
 * Errors are logged but don't stop the app.
 */
function prefetchInBackground(queryClient: QueryClient): void {
  console.log("AppStart: background prefetch started");
  
  // Prefetch all data in parallel
  Promise.all([
    // Prefetch fixtures (for fixtures mode)
    queryClient
      .prefetchQuery({
        queryKey: fixturesKeys.upcoming({ page: 1, perPage: 20 }),
        queryFn: () => fetchUpcomingFixtures({ page: 1, perPage: 20 }),
        meta: { scope: "user" },
      })
      .catch((error) => {
        console.log("AppStart: background prefetch fixtures error", error);
      }),

    // Prefetch leagues (for leagues mode)
    queryClient
      .prefetchQuery({
        queryKey: leaguesKeys.list({ page: 1, perPage: 20 }),
        queryFn: () => fetchLeagues({ page: 1, perPage: 20 }),
        meta: { scope: "user" },
      })
      .catch((error) => {
        console.log("AppStart: background prefetch leagues error", error);
      }),

    // Prefetch teams (for teams mode)
    queryClient
      .prefetchQuery({
        queryKey: teamsKeys.list({ page: 1, perPage: 20 }),
        queryFn: () => fetchTeams({ page: 1, perPage: 20 }),
        meta: { scope: "user" },
      })
      .catch((error) => {
        console.log("AppStart: background prefetch teams error", error);
      }),

    // Prefetch groups (for groups screen)
    queryClient
      .prefetchQuery({
        queryKey: groupsKeys.list(),
        queryFn: () => fetchMyGroups(),
        meta: { scope: "user" },
      })
      .catch((error) => {
        console.log("AppStart: background prefetch groups error", error);
      }),
  ])
    .then(() => {
      console.log("AppStart: background prefetch completed");
    })
    .catch((error) => {
      // This should not happen as each promise has its own catch
      console.log("AppStart: unexpected background prefetch error", error);
    });
}
