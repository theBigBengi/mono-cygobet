// domains/fixtures/fixture-detail.api.ts
// API for fetching a single fixture with full detail and user's predictions across groups.

import type { ApiFixtureDetailResponse } from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

/**
 * Fetch fixture detail by id (full fixture + user's predictions across all groups).
 * Requires auth + onboarding complete.
 */
export async function fetchFixtureDetail(
  fixtureId: number
): Promise<ApiFixtureDetailResponse> {
  return apiFetchWithAuthRetry<ApiFixtureDetailResponse>(
    `/api/fixtures/${fixtureId}`,
    { method: "GET" }
  );
}
