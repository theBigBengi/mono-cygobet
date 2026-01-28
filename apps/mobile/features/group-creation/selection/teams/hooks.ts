// features/group-creation/selection/teams/hooks.ts
// React hooks for group teams selection.

import { useAtomValue } from "jotai";
import {
  selectedTeamsAtom,
  selectedTeamsCountAtom,
  hasSelectedTeamsAtom,
} from "./store";
import {
  toggleTeam,
  clearSelectedTeams,
} from "./actions";
import type { SelectedTeamData } from "./types";

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
