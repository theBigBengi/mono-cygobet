// features/groups/group-teams-selection/group-teams-selection.hooks.ts
// React hooks for group teams selection.

import { useAtomValue } from "jotai";
import {
  selectedTeamsAtom,
  selectedTeamsCountAtom,
  hasSelectedTeamsAtom,
} from "./group-teams-selection.store";
import {
  toggleTeam,
  clearSelectedTeams,
} from "./group-teams-selection.actions";
import type { SelectedTeamData } from "./group-teams-selection.types";

export function useSelectedTeams(): SelectedTeamData[] {
  return useAtomValue(selectedTeamsAtom);
}

export function useSelectedTeamsCount(): number {
  return useAtomValue(selectedTeamsCountAtom);
}

export function useHasSelectedTeams(): boolean {
  return useAtomValue(hasSelectedTeamsAtom);
}

export function useToggleTeam() {
  return toggleTeam;
}

export function useClearSelectedTeamsHook() {
  return clearSelectedTeams;
}

export function useIsTeamSelected(teamId: number): boolean {
  const teams = useAtomValue(selectedTeamsAtom);
  return teams.some((t) => t.id === teamId);
}
