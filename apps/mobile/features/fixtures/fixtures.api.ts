// fixtures feature API module.
// - Encapsulates HTTP calls for fixtures.
// - Screens and components must NEVER talk to apiClient directly.
import type {
  ApiFixturesListResponse,
  ApiUpcomingFixturesQuery,
} from "@repo/types";
import { apiFetch, apiFetchWithAuthRetry } from "@/lib/http/apiClient";

/**
 * Public upcoming fixtures query params (minimal contract).
 * Only supports pagination and optional days.
 */
export type PublicUpcomingFixturesParams = {
  page?: number;
  perPage?: number;
  days?: number;
};

/**
 * Protected upcoming fixtures query params.
 * Supports full filter set (from/to, leagues, markets, include, etc.).
 */
export type ProtectedUpcomingFixturesParams = {
  page?: number;
  perPage?: number;
} & Partial<ApiUpcomingFixturesQuery>;

/**
 * Build query string with proper array encoding.
 * - Scalars: single key=value
 * - Arrays: repeated keys (leagues=1&leagues=2, not leagues=1,2)
 * - Never overwrites previously set values for the same key.
 */
function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Arrays: append each element as a separate key
      for (const item of value) {
        search.append(key, String(item));
      }
    } else {
      // Scalars: single key=value
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Fetch upcoming fixtures from the PUBLIC endpoint.
 * - No auth required.
 * - Minimal contract: only page, perPage, optional days.
 * - Server always includes league, teams, country (hardcoded).
 */
export async function fetchPublicUpcomingFixtures(
  params: PublicUpcomingFixturesParams = {}
): Promise<ApiFixturesListResponse> {
  const { page = 1, perPage = 20, days = 5 } = params;

  const queryString = buildQuery({ page, perPage, days });

  // Path prefix: getApiBaseUrl() returns host-only (e.g., "http://localhost:4000").
  // Server routes in routes/api/ are mounted at /api by Fastify autoload.
  // Full path: baseUrl + "/api/public/fixtures/upcoming"
  return apiFetch<ApiFixturesListResponse>(
    `/api/public/fixtures/upcoming${queryString}`
  );
}

/**
 * Fetch upcoming fixtures from the PROTECTED endpoint.
 * - Requires auth + onboarding complete.
 * - Uses apiFetchWithAuthRetry for access token handling.
 * - Supports full filter set (from/to, leagues, markets, include, etc.).
 */
export async function fetchProtectedUpcomingFixtures(
  params: ProtectedUpcomingFixturesParams = {}
): Promise<ApiFixturesListResponse> {
  const {
    page = 1,
    perPage = 20,
    from,
    to,
    leagues,
    markets,
    hasOdds,
    include = "league,teams,country,odds",
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

  // Path prefix: getApiBaseUrl() returns host-only (e.g., "http://localhost:4000").
  // Server routes in routes/api/ are mounted at /api by Fastify autoload.
  // Full path: baseUrl + "/api/fixtures/upcoming"
  return apiFetchWithAuthRetry<ApiFixturesListResponse>(
    `/api/fixtures/upcoming${queryString}`,
    { method: "GET" }
  );
}
