// features/groups/group-leagues-selection/index.ts
// Barrel export for group leagues selection feature.

export {
  useSelectedLeagues,
  useSelectedLeaguesCount,
  useHasSelectedLeagues,
  useToggleLeague,
  useClearSelectedLeaguesHook,
  useIsLeagueSelected,
} from "./group-leagues-selection.hooks";
export type { LeagueId, SelectedLeagueData } from "./group-leagues-selection.types";
