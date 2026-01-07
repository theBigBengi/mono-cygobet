// React Query hooks for fixtures.
// - Public vs protected upcoming feeds are separated by endpoint and enabled flag.
import { useQuery } from "@tanstack/react-query";
import type { ApiFixturesListResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/authGuards";
import {
  fetchPublicUpcomingFixtures,
  fetchProtectedUpcomingFixtures,
  type PublicUpcomingFixturesParams,
  type ProtectedUpcomingFixturesParams,
} from "./fixtures.api";
import { fixturesKeys } from "./fixtures.keys";

/**
 * Public upcoming fixtures query hook.
 * - Always enabled (no auth required).
 * - Query key includes days (public endpoint uses it).
 */
export function usePublicUpcomingFixturesQuery(
  params: PublicUpcomingFixturesParams
) {
  const { page = 1, perPage = 20, days = 5 } = params;

  return useQuery<ApiFixturesListResponse, ApiError>({
    queryKey: fixturesKeys.publicUpcoming({ page, perPage, days }),
    queryFn: () => fetchPublicUpcomingFixtures({ page, perPage, days }),
  });
}

/**
 * Protected upcoming fixtures query hook.
 * - Enabled only when authed + onboarding complete.
 * - Query key does NOT include days (protected endpoint doesn't use it).
 */
export function useProtectedUpcomingFixturesQuery(
  params: ProtectedUpcomingFixturesParams
) {
  const { status, user } = useAuth();
  const { page = 1, perPage = 20 } = params;

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiFixturesListResponse, ApiError>({
    queryKey: fixturesKeys.protectedUpcoming({ page, perPage }),
    queryFn: () => fetchProtectedUpcomingFixtures({ page, perPage }),
    enabled,
    meta: { scope: "user" },
  });
}


