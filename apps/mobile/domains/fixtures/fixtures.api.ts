// domains/fixtures/fixtures.api.ts
// Domain API module for fixtures.
// - Encapsulates HTTP calls for fixtures data.
// - Feature-agnostic: no knowledge of who uses it.

import type {
  ApiFixturesListResponse,
  ApiUpcomingFixturesQuery,
  ApiMyPredictionsForFixtureResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import { buildQuery } from "@/lib/http/queryBuilder";

/**
 * Fetch upcoming fixtures.
 * - Requires auth + onboarding complete.
 * - Uses apiFetchWithAuthRetry for access token handling.
 * - Supports full filter set (from/to, leagues, markets, include, etc.).
 */
export async function fetchUpcomingFixtures(
  params: ApiUpcomingFixturesQuery = {}
): Promise<ApiFixturesListResponse> {
  const {
    page = 1,
    perPage = 20,
    from,
    to,
    leagues,
    markets,
    hasOdds,
    include = "league,teams,country",
  } = params;

  const queryString = buildQuery({
    page,
    perPage,
    from,
    to,
    leagues,
    markets,
    hasOdds,
    include,
  });

  return apiFetchWithAuthRetry<ApiFixturesListResponse>(
    `/api/fixtures/upcoming${queryString}`,
    { method: "GET" }
  );
}

/**
 * Fetch current user's predictions for a fixture (all joined groups).
 * - Requires auth + onboarding complete.
 */
export async function fetchMyPredictionsForFixture(
  fixtureId: number
): Promise<ApiMyPredictionsForFixtureResponse> {
  return apiFetchWithAuthRetry<ApiMyPredictionsForFixtureResponse>(
    `/api/fixtures/${fixtureId}/my-predictions`,
    { method: "GET" }
  );
}
