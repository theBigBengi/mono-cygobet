// features/group-creation/selection/teams/index.ts
// Barrel export for group teams selection feature.

export {
  useSelectedTeams,
  useSelectedTeamsCount,
  useHasSelectedTeams,
  useToggleTeam,
  useClearSelectedTeamsHook,
  useIsTeamSelected,
} from "./hooks";
export type { TeamId, SelectedTeamData } from "./types";
