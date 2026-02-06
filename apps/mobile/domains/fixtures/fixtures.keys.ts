// domains/fixtures/fixtures.keys.ts
// React Query keys for fixtures domain.
// - All fixtures-related queries/mutations must use these keys.
// - Keys must reflect ONLY real request inputs (no unused params).

import type { ApiUpcomingFixturesQuery } from "@repo/types";

export const fixturesKeys = {
  all: ["fixtures"] as const,
  upcoming: (params: ApiUpcomingFixturesQuery) =>
    [...fixturesKeys.all, "upcoming", params] as const,
  detail: (id: number) => [...fixturesKeys.all, "detail", id] as const,
  myPredictions: (fixtureId: number) =>
    [...fixturesKeys.all, "my-predictions", fixtureId] as const,
} as const;
