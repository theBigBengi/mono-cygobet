// domains/fixtures/fixture-detail.hooks.ts
// React Query hook for fixture detail.

import { useQuery } from "@tanstack/react-query";
import type { ApiFixtureDetailResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { fetchFixtureDetail } from "./fixture-detail.api";
import { fixturesKeys } from "./fixtures.keys";

/**
 * Fixture detail query hook.
 * Enabled only when fixtureId is non-null.
 */
export function useFixtureDetailQuery(fixtureId: number | null) {
  return useQuery<ApiFixtureDetailResponse, ApiError>({
    queryKey: fixturesKeys.detail(fixtureId!),
    queryFn: () => fetchFixtureDetail(fixtureId!),
    enabled: fixtureId != null,
    meta: { scope: "user" },
  });
}
