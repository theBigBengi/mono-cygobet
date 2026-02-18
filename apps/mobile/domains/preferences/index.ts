// domains/preferences/index.ts
// Public exports for preferences domain.

export {
  useLeaguePreferences,
  useUpdateLeaguePreferences,
  useResetLeaguePreferences,
} from "./preferences.hooks";
export { preferencesKeys } from "./preferences.keys";
export type {
  ApiUserLeaguePreferences,
  ApiUserLeaguePreferencesResponse,
} from "@repo/types";
