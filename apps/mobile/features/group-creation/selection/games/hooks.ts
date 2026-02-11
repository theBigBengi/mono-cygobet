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
  addMultipleGroupGames,
  removeMultipleGroupGames,
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
 * Get add multiple games function
 * Used for "Add All" functionality
 */
export function useAddMultipleGroupGames() {
  return addMultipleGroupGames;
}

/**
 * Get remove multiple games function
 * Used for "Remove All" functionality
 */
export function useRemoveMultipleGroupGames() {
  return removeMultipleGroupGames;
}

/**
 * Check if all games in a list are selected
 * Used for "Add All" / "Remove All" toggle
 */
export function useAreAllGamesSelected(fixtureIds: FixtureId[]): boolean {
  const state = useAtomValue(selectedGroupGamesAtom);
  const hydrated = useAtomValue(groupGamesHydratedAtom);

  if (!hydrated || fixtureIds.length === 0) {
    return false;
  }

  return fixtureIds.every((id) => !!state.games[String(id)]);
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
