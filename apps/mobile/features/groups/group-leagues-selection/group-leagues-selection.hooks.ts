// features/groups/group-leagues-selection/group-leagues-selection.hooks.ts
// React hooks for group leagues selection.

import { useAtomValue } from "jotai";
import {
  selectedLeaguesAtom,
  selectedLeaguesCountAtom,
  hasSelectedLeaguesAtom,
} from "./group-leagues-selection.store";
import {
  toggleLeague,
  clearSelectedLeagues,
} from "./group-leagues-selection.actions";
import type { SelectedLeagueData } from "./group-leagues-selection.types";

export function useSelectedLeagues(): SelectedLeagueData[] {
  return useAtomValue(selectedLeaguesAtom);
}

export function useSelectedLeaguesCount(): number {
  return useAtomValue(selectedLeaguesCountAtom);
}

export function useHasSelectedLeagues(): boolean {
  return useAtomValue(hasSelectedLeaguesAtom);
}

export function useToggleLeague() {
  return toggleLeague;
}

export function useClearSelectedLeaguesHook() {
  return clearSelectedLeagues;
}

export function useIsLeagueSelected(leagueId: number): boolean {
  const leagues = useAtomValue(selectedLeaguesAtom);
  return leagues.some((l) => l.id === leagueId);
}
