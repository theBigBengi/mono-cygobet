// domains/fixtures/fixture-detail.hooks.ts
// React Query hook for fixture detail.

import { useQuery } from "@tanstack/react-query";
import type { ApiFixtureDetailResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import { fetchFixtureDetail } from "./fixture-detail.api";
import { fixturesKeys } from "./fixtures.keys";

/**
 * Fixture detail query hook.
 * - Enabled only when authed + onboarding complete and fixtureId is valid.
 */
export function useFixtureDetailQuery(fixtureId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) && fixtureId != null;

  return useQuery<ApiFixtureDetailResponse, ApiError>({
    queryKey: fixturesKeys.detail(fixtureId!),
    queryFn: () => fetchFixtureDetail(fixtureId!),
    enabled,
    meta: { scope: "user" },
  });
}
