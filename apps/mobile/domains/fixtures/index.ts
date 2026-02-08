// domains/fixtures/index.ts
// Public exports for fixtures domain.

export {
  useUpcomingFixturesQuery,
  useMyPredictionsForFixture,
} from "./fixtures.hooks";
export { useFixtureDetailQuery } from "./fixture-detail.hooks";
export { fixturesKeys } from "./fixtures.keys";
export { fetchUpcomingFixtures, fetchMyPredictionsForFixture } from "./fixtures.api";
export { fetchFixtureDetail } from "./fixture-detail.api";
export type {
  ApiUpcomingFixturesQuery,
  ApiFixturesListResponse,
  ApiFixtureDetailResponse,
  ApiMyPredictionsForFixtureResponse,
  ApiMyPredictionForFixtureItem,
} from "@repo/types";
