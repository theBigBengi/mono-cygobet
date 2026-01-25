// domains/leagues/index.ts
// Public exports for leagues domain.

export { useLeaguesQuery } from "./leagues.hooks";
export { leaguesKeys } from "./leagues.keys";
export type {
  ApiLeagueItem,
  ApiLeaguesQuery,
  ApiLeaguesResponse,
} from "@repo/types";
