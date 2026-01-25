// domains/teams/teams.api.ts
// Domain API module for teams.
// - Encapsulates HTTP calls for teams data.
// - Feature-agnostic: no knowledge of who uses it.

import type { ApiTeamsResponse, ApiTeamsQuery } from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import { buildQuery } from "@/lib/http/queryBuilder";

/**
 * Fetch teams from the protected endpoint.
 * - Requires authentication.
 * - Supports optional filtering by leagueId.
 * - Returns paginated list of teams.
 */
export async function fetchTeams(
  params: ApiTeamsQuery = {}
): Promise<ApiTeamsResponse> {
  const queryString = buildQuery(params);
  return apiFetchWithAuthRetry<ApiTeamsResponse>(`/api/teams${queryString}`, {
    method: "GET",
  });
}
