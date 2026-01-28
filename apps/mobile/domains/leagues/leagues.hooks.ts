// domains/leagues/leagues.hooks.ts
// React Query hooks for leagues domain.
// - Feature-agnostic: can be used by any feature that needs leagues data.

import { useQuery } from "@tanstack/react-query";
import type { ApiLeaguesResponse, ApiLeaguesQuery } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/authGuards";
import { fetchLeagues } from "./leagues.api";
import { leaguesKeys } from "./leagues.keys";

/**
 * Hook to fetch paginated list of leagues.
 * - Enabled only when authenticated and onboarding complete.
 * - Supports preset="popular" for popular leagues.
 * - Supports optional search by league name.
 * - Returns leagues data with loading/error states.
 */
export function useLeaguesQuery(params: ApiLeaguesQuery = {}) {
  const { status, user } = useAuth();
  const { page = 1, perPage = 20, includeSeasons, onlyActiveSeasons, preset, search } = params;

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiLeaguesResponse, ApiError>({
    queryKey: leaguesKeys.list({
      page,
      perPage,
      includeSeasons,
      onlyActiveSeasons,
      preset,
      search,
    }),
    queryFn: () =>
      fetchLeagues({ page, perPage, includeSeasons, onlyActiveSeasons, preset, search }),
    enabled,
    meta: { scope: "user" },
  });
}
