// domains/leagues/leagues.api.ts
// Domain API module for leagues.
// - Encapsulates HTTP calls for leagues data.
// - Feature-agnostic: no knowledge of who uses it.

import type { ApiLeaguesResponse, ApiLeaguesQuery } from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import { buildQuery } from "@/lib/http/queryBuilder";

/**
 * Fetch leagues from the protected endpoint.
 * - Requires authentication.
 * - Returns paginated list of leagues.
 */
export async function fetchLeagues(
  params: ApiLeaguesQuery = {}
): Promise<ApiLeaguesResponse> {
  const queryString = buildQuery(params);
  return apiFetchWithAuthRetry<ApiLeaguesResponse>(
    `/api/leagues${queryString}`,
    { method: "GET" }
  );
}
