// domains/fixtures/fixtures.hooks.ts
// React Query hooks for fixtures domain.
// - Feature-agnostic: can be used by any feature that needs fixtures data.

import { useQuery } from "@tanstack/react-query";
import type {
  ApiFixturesListResponse,
  ApiUpcomingFixturesQuery,
  ApiMyPredictionsForFixtureResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";

import { fetchUpcomingFixtures, fetchMyPredictionsForFixture } from "./fixtures.api";
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
 * Hook: current user's predictions for a fixture across all groups.
 * - Enabled only when authed + onboarding complete and fixtureId is valid.
 */
export function useMyPredictionsForFixture(fixtureId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) && fixtureId != null && fixtureId > 0;

  return useQuery<ApiMyPredictionsForFixtureResponse, ApiError>({
    queryKey: fixturesKeys.myPredictions(fixtureId ?? 0),
    queryFn: () => fetchMyPredictionsForFixture(fixtureId!),
    enabled,
    meta: { scope: "user" },
  });
}
