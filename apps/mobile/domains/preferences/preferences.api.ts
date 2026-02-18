// domains/preferences/preferences.api.ts
// Domain API module for user preferences.
// - Encapsulates HTTP calls for user preferences data.

import type { ApiUserLeaguePreferencesResponse } from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

/**
 * Fetch user's league order preferences.
 */
export async function fetchLeaguePreferences(): Promise<ApiUserLeaguePreferencesResponse> {
  return apiFetchWithAuthRetry<ApiUserLeaguePreferencesResponse>(
    "/api/users/preferences/league-order",
    { method: "GET" }
  );
}

/**
 * Update user's league order preferences.
 */
export async function updateLeaguePreferences(
  leagueOrder: number[]
): Promise<ApiUserLeaguePreferencesResponse> {
  return apiFetchWithAuthRetry<ApiUserLeaguePreferencesResponse>(
    "/api/users/preferences/league-order",
    {
      method: "PUT",
      body: JSON.stringify({ leagueOrder }),
    }
  );
}

/**
 * Reset user's league order preferences to default.
 */
export async function resetLeaguePreferences(): Promise<ApiUserLeaguePreferencesResponse> {
  return apiFetchWithAuthRetry<ApiUserLeaguePreferencesResponse>(
    "/api/users/preferences/league-order",
    { method: "DELETE" }
  );
}
