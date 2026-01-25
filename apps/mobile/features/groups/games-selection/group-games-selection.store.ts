// features/group-games-selection/group-games-selection.store.ts
// Jotai store for group games selection state management.
// Plain atoms only - no storage atoms, no persistence logic.

import { atom } from "jotai";
import type { GroupGamesState } from "./group-games-selection.types";

/**
 * Main group games atom - holds the runtime selected games state
 * Initial state is empty: { games: {} }
 */
export const selectedGroupGamesAtom = atom<GroupGamesState>({ games: {} });

/**
 * Hydration flag atom - indicates whether group games have been loaded from storage
 * Initial: false (not hydrated yet)
 */
export const groupGamesHydratedAtom = atom<boolean>(false);

/**
 * Derived atom: count of selected games
 */
export const selectedGroupGamesCountAtom = atom((get) => {
  const state = get(selectedGroupGamesAtom);
  return Object.keys(state.games).length;
});

/**
 * Derived atom: boolean indicating if any games are selected
 */
export const hasSelectedGroupGamesAtom = atom((get) => {
  const state = get(selectedGroupGamesAtom);
  return Object.keys(state.games).length > 0;
});

/**
 * Derived atom: array of selected games, sorted by fixtureId
 */
export const selectedGroupGamesArrayAtom = atom((get) => {
  const state = get(selectedGroupGamesAtom);
  return Object.entries(state.games)
    .map(([fixtureIdStr, gameData]) => ({
      fixtureId: Number(fixtureIdStr),
      game: gameData,
    }))
    .sort((a, b) => a.fixtureId - b.fixtureId);
});
