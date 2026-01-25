// domains/fixtures/index.ts
// Public exports for fixtures domain.

export {
  useUpcomingFixturesQuery,
  useDummyFixturesMutation,
} from "./fixtures.hooks";
export { fixturesKeys } from "./fixtures.keys";
export { fetchUpcomingFixtures } from "./fixtures.api";
export type {
  ApiUpcomingFixturesQuery,
  ApiFixturesListResponse,
} from "@repo/types";
