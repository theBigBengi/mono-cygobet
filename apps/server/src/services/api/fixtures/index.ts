// fixtures/index.ts
// Fixtures API: service + query builders.

export {
  getUpcomingFixtures,
  type GetUpcomingFixturesParams,
  type MobileUpcomingFixturesResult,
} from "./service";

export {
  buildUpcomingFixturesWhere,
  buildFixturesByLeaguesWhere,
  buildFixturesByTeamsWhere,
  buildFixturesWithOddsWhere,
} from "./queries";

export { buildFixtureSelect } from "./selects";
