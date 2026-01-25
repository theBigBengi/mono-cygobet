// domains/teams/teams.hooks.ts
// React Query hooks for teams domain.
// - Feature-agnostic: can be used by any feature that needs teams data.

import { useQuery } from "@tanstack/react-query";
import type { ApiTeamsResponse, ApiTeamsQuery } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/authGuards";
import { fetchTeams } from "./teams.api";
import { teamsKeys } from "./teams.keys";

/**
 * Hook to fetch paginated list of teams.
 * - Enabled only when authenticated and onboarding complete.
 * - Supports optional filtering by leagueId.
 * - Returns teams data with loading/error states.
 */
export function useTeamsQuery(params: ApiTeamsQuery = {}) {
  const { status, user } = useAuth();
  const { page = 1, perPage = 20, leagueId, includeCountry, search } = params;

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiTeamsResponse, ApiError>({
    queryKey: teamsKeys.list({
      page,
      perPage,
      leagueId,
      includeCountry,
      search,
    }),
    queryFn: () =>
      fetchTeams({ page, perPage, leagueId, includeCountry, search }),
    enabled,
    meta: { scope: "user" },
  });
}
