// features/group-creation/selection/games/hooks.ts
// React hooks for group games selection feature (thin wrappers).
// Screens/components should import from here.
// No storage logic, no bootstrap, no normalization here.

import { useAtomValue } from "jotai";
import {
  selectedGroupGamesAtom,
  selectedGroupGamesArrayAtom,
  selectedGroupGamesCountAtom,
  hasSelectedGroupGamesAtom,
  groupGamesHydratedAtom,
} from "./store";
import {
  toggleGroupGame,
  clearSelectedGroupGames,
} from "./actions";
import type { FixtureId } from "./types";

/**
 * Check if a specific game is selected
 * Returns false if not selected OR if group games are not yet hydrated
 * This prevents flicker and prevents UI from showing incorrect state before hydration
 */
export function useIsGroupGameSelected(fixtureId: FixtureId): boolean {
  const state = useAtomValue(selectedGroupGamesAtom);
  const hydrated = useAtomValue(groupGamesHydratedAtom);

  // Ready gate: don't show selected state until hydrated
  if (!hydrated) {
    return false;
  }

  return !!state.games[String(fixtureId)];
}

/**
 * Get toggle group game function
 * Requires fixtureId and gameData
 * Hooks only expose actions - no storage logic here
 */
export function useToggleGroupGame() {
  return toggleGroupGame;
}

/**
 * Get selected group games array, count, and hasAnyGame flag
 */
export function useSelectedGroupGames(): {
  games: { fixtureId: number; game: any }[];
  count: number;
  hasAnyGame: boolean;
} {
  const games = useAtomValue(selectedGroupGamesArrayAtom);
  const count = useAtomValue(selectedGroupGamesCountAtom);
  const hasAnyGame = useAtomValue(hasSelectedGroupGamesAtom);

  return {
    games,
    count,
    hasAnyGame,
  };
}

/**
 * Get clear group games function
 * Hooks only expose actions - no storage logic here
 */
export function useClearGroupGamesHook() {
  return clearSelectedGroupGames;
}

/**
 * Check if group games have been hydrated from storage
 * Useful for preventing UI flicker
 */
export function useGroupGamesHydrated(): boolean {
  return useAtomValue(groupGamesHydratedAtom);
}
