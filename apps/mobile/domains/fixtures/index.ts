// domains/fixtures/index.ts
// Public exports for fixtures domain.

export {
  useUpcomingFixturesQuery,
  useDummyFixturesMutation,
} from "./fixtures.hooks";
export { useFixtureDetailQuery } from "./fixture-detail.hooks";
export { fixturesKeys } from "./fixtures.keys";
export { fetchUpcomingFixtures } from "./fixtures.api";
export { fetchFixtureDetail } from "./fixture-detail.api";
export type {
  ApiUpcomingFixturesQuery,
  ApiFixturesListResponse,
  ApiFixtureDetailResponse,
} from "@repo/types";
