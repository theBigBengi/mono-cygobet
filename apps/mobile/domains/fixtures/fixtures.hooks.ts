// domains/fixtures/fixtures.hooks.ts
// React Query hooks for fixtures domain.
// - Feature-agnostic: can be used by any feature that needs fixtures data.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiFixturesListResponse,
  ApiUpcomingFixturesQuery,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";

import { fetchUpcomingFixtures } from "./fixtures.api";
import { fixturesKeys } from "./fixtures.keys";

/**
 * Upcoming fixtures query hook.
 * - Enabled only when authed + onboarding complete.
 */
export function useUpcomingFixturesQuery(
  params: ApiUpcomingFixturesQuery = {}
) {
  const { status, user } = useAuth();

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiFixturesListResponse, ApiError>({
    queryKey: fixturesKeys.upcoming(params),
    queryFn: () => fetchUpcomingFixtures(params),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * Placeholder mutation hook for fixtures.
 * - All fixtures mutations should invalidate fixturesKeys as appropriate.
 */
export function useDummyFixturesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: async (input: YourPayloadType) => { ... },
    onSuccess: () => {
      // Example: invalidate both public and protected upcoming feeds
      queryClient.invalidateQueries({ queryKey: fixturesKeys.all });
    },
  });
}
