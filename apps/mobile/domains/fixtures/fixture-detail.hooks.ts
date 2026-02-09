// domains/fixtures/fixture-detail.hooks.ts
// React Query hook for fixture detail.

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { ApiFixtureDetailResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { analytics } from "@/lib/analytics";
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

  const trackedRef = useRef<number | null>(null);
  const query = useQuery<ApiFixtureDetailResponse, ApiError>({
    queryKey: fixturesKeys.detail(fixtureId!),
    queryFn: () => fetchFixtureDetail(fixtureId!),
    enabled,
    meta: { scope: "user" },
  });

  // Track match viewed once per fixtureId
  useEffect(() => {
    if (query.data && fixtureId && trackedRef.current !== fixtureId) {
      trackedRef.current = fixtureId;
      const fixture = query.data.data;
      analytics.track("match_viewed", {
        fixtureId,
        league: fixture?.league?.name,
      });
    }
  }, [query.data, fixtureId]);

  return query;
}
