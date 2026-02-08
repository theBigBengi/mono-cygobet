// lib/appStart/appStart.prefetch.ts
// Prefetch data based on current auth state.
// Called after bootstrap completes and React state has updated.
// Prefetch happens in background - app shows immediately.

import type { QueryClient } from "@tanstack/react-query";
import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import type { AppStartError, AppStartStatus } from "./appStart.types";
import { fetchUpcomingFixtures, fixturesKeys } from "@/domains/fixtures";
import { fetchLeagues } from "@/domains/leagues/leagues.api";
import { leaguesKeys } from "@/domains/leagues/leagues.keys";
import { fetchTeams } from "@/domains/teams/teams.api";
import { teamsKeys } from "@/domains/teams/teams.keys";
import { fetchMyGroups } from "@/domains/groups/groups-core.api";
import { fetchUnreadCounts } from "@/domains/groups/groups-chat.api";
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
  if (__DEV__) console.log(
    "AppStart: prefetchInitialData - status:",
    status,
    "user:",
    user ? "exists" : "null"
  );

  if (status === "unauthenticated") {
    // Unauthenticated: no prefetch needed, just mark ready for login screen
    if (__DEV__) console.log("AppStart: unauthenticated, skipping prefetch");
    setStatus("ready");
    if (__DEV__) console.log("AppStart: ready (unauthenticated - will show login)");
    return;
  }

  if (status === "authenticated") {
    // Authenticated: user should be present
    if (!user) {
      // Defensive: user missing despite authenticated state - try to mark ready but log
      if (__DEV__) console.log(
        "AppStart: authenticated but user is null (unexpected), marking ready"
      );
      setStatus("ready");
      if (__DEV__) console.log("AppStart: ready (authenticated but user not present)");
      return;
    }

    if (user.onboardingRequired) {
      // Onboarding required: skip prefetch, mark ready for onboarding flow
      if (__DEV__) console.log("AppStart: onboarding required, skipping prefetch");
      setStatus("ready");
      if (__DEV__) console.log("AppStart: ready (onboarding required)");
      return;
    }

    // Onboarding complete: mark ready immediately, prefetch in background
    if (__DEV__) console.log(
      "AppStart: marking ready immediately, starting background prefetch"
    );
    setStatus("ready");
    if (__DEV__) console.log("AppStart: ready (authenticated onboarded)");

    // Prefetch in background (fire-and-forget)
    prefetchInBackground(queryClient);
    return;
  }

  if (status === "onboarding") {
    if (__DEV__) console.log(
      "AppStart: onboarding state, skipping prefetch and marking ready"
    );
    setStatus("ready");
    return;
  }

  if (status === "degraded") {
    // Degraded: network issues but session may exist. Mark ready and optionally prefetch limited data.
    if (__DEV__) console.log(
      "AppStart: degraded state, marking ready without background prefetch"
    );
    setStatus("ready");
    return;
  }

  if (status === "idle" || status === "restoring") {
    // Status is still restoring - bootstrap might be retrying or network issue
    // Do not turn this into error automatically, stay in booting state
    if (__DEV__) console.log(
      "AppStart: status still restoring/idle, staying in booting state"
    );
    // Don't change status - keep it as "booting" so the effect can retry
    return;
  }

  // Unknown status - should not happen
  if (__DEV__) console.log("AppStart: unknown status:", status);
  setStatus("error");
  setError({
    message: "Unexpected auth state. Please retry.",
    kind: "unknown",
  });
}

/**
 * Prefetch data in background (fire-and-forget).
 * Performs prefetch of leagues, teams, groups, and fixtures in parallel.
 * Errors are logged but don't stop the app.
 */
function prefetchInBackground(queryClient: QueryClient): void {
  if (__DEV__) console.log("AppStart: background prefetch started");

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
        if (__DEV__) console.log("AppStart: background prefetch fixtures error", error);
      }),

    // Prefetch leagues (for leagues mode)
    queryClient
      .prefetchQuery({
        queryKey: leaguesKeys.list({ page: 1, perPage: 20 }),
        queryFn: () => fetchLeagues({ page: 1, perPage: 20 }),
        meta: { scope: "user" },
      })
      .catch((error) => {
        if (__DEV__) console.log("AppStart: background prefetch leagues error", error);
      }),

    // Prefetch teams (for teams mode)
    queryClient
      .prefetchQuery({
        queryKey: teamsKeys.list({ page: 1, perPage: 20 }),
        queryFn: () => fetchTeams({ page: 1, perPage: 20 }),
        meta: { scope: "user" },
      })
      .catch((error) => {
        if (__DEV__) console.log("AppStart: background prefetch teams error", error);
      }),

    // Prefetch groups (for groups screen)
    queryClient
      .prefetchQuery({
        queryKey: groupsKeys.list(),
        queryFn: () => fetchMyGroups(),
        meta: { scope: "user" },
      })
      .catch((error) => {
        if (__DEV__) console.log("AppStart: background prefetch groups error", error);
      }),

    // Prefetch unread counts (for groups tab badge)
    queryClient
      .prefetchQuery({
        queryKey: groupsKeys.unreadCounts(),
        queryFn: () => fetchUnreadCounts(),
        meta: { scope: "user" },
      })
      .catch((error) => {
        if (__DEV__) console.log("AppStart: background prefetch unread counts error", error);
      }),
  ])
    .then(() => {
      if (__DEV__) console.log("AppStart: background prefetch completed");
    })
    .catch((error) => {
      // This should not happen as each promise has its own catch
      if (__DEV__) console.log("AppStart: unexpected background prefetch error", error);
    });
}
