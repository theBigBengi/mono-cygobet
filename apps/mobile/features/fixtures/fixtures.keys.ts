// Query keys for the fixtures feature.
// - All fixtures-related queries/mutations must use these keys.
// - Keys must reflect ONLY real request inputs (no unused params).

type PublicUpcomingKeyParams = {
  page: number;
  perPage: number;
  days: number; // Public endpoint uses days
};

type ProtectedUpcomingKeyParams = {
  page: number;
  perPage: number;
  // Protected endpoint does NOT use days (server enforces its own window)
  // Future: add from/to if endpoint accepts them
};

export const fixturesKeys = {
  all: ["fixtures"] as const,
  publicUpcoming: (params: PublicUpcomingKeyParams) =>
    [...fixturesKeys.all, "publicUpcoming", params] as const,
  protectedUpcoming: (params: ProtectedUpcomingKeyParams) =>
    [...fixturesKeys.all, "protectedUpcoming", params] as const,
} as const;


