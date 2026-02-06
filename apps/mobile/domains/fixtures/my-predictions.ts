// domains/fixtures/my-predictions.ts
// API + hook for fetching current user's predictions for a fixture across all groups.

import { useQuery } from "@tanstack/react-query";
import type { ApiMyPredictionsForFixtureResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";
import { fixturesKeys } from "./fixtures.keys";

/**
 * Fetch current user's predictions for a fixture (all joined groups).
 * Requires auth + onboarding complete.
 */
export async function fetchMyPredictionsForFixture(
  fixtureId: number
): Promise<ApiMyPredictionsForFixtureResponse> {
  return apiFetchWithAuthRetry<ApiMyPredictionsForFixtureResponse>(
    `/api/fixtures/${fixtureId}/my-predictions`,
    { method: "GET" }
  );
}

/**
 * Hook: current user's predictions for a fixture across all groups.
 * Enabled only when fixtureId is valid.
 */
export function useMyPredictionsForFixture(fixtureId: number | null) {
  return useQuery<ApiMyPredictionsForFixtureResponse, ApiError>({
    queryKey: fixturesKeys.myPredictions(fixtureId ?? 0),
    queryFn: () => fetchMyPredictionsForFixture(fixtureId!),
    enabled: fixtureId != null && fixtureId > 0,
    meta: { scope: "user" },
  });
}
