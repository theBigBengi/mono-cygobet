// features/groups/group-teams-selection/index.ts
// Barrel export for group teams selection feature.

export {
  useSelectedTeams,
  useSelectedTeamsCount,
  useHasSelectedTeams,
  useToggleTeam,
  useClearSelectedTeamsHook,
  useIsTeamSelected,
} from "./group-teams-selection.hooks";
export type { TeamId, SelectedTeamData } from "./group-teams-selection.types";
