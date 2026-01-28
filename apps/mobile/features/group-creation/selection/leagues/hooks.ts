// features/group-creation/selection/leagues/hooks.ts
// React hooks for group leagues selection.

import { useAtomValue } from "jotai";
import {
  selectedLeaguesAtom,
  selectedLeaguesCountAtom,
  hasSelectedLeaguesAtom,
} from "./store";
import {
  toggleLeague,
  clearSelectedLeagues,
} from "./actions";
import type { SelectedLeagueData } from "./types";

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
