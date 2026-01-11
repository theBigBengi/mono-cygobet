// features/picks/picks.store.ts
// Jotai store for picks state management.
// Plain atoms only - no storage atoms, no persistence logic.

import { atom } from "jotai";
import type { PicksState, SelectedPick } from "./picks.types";

/**
 * Main picks atom - holds the runtime picks state
 * Initial state is empty: { picks: {} }
 */
export const picksAtom = atom<PicksState>({ picks: {} });

/**
 * Hydration flag atom - indicates whether picks have been loaded from storage
 * Initial: false (not hydrated yet)
 */
export const picksHydratedAtom = atom<boolean>(false);

/**
 * Derived atom: count of selected fixtures
 */
export const picksCountAtom = atom((get) => {
  const state = get(picksAtom);
  return Object.keys(state.picks).length;
});

/**
 * Derived atom: boolean indicating if any picks exist
 */
export const hasAnyPickAtom = atom((get) => {
  const state = get(picksAtom);
  return Object.keys(state.picks).length > 0;
});

/**
 * Derived atom: array of selected picks, sorted by fixtureId
 * Compatible with existing UI components
 */
export const selectedPicksArrayAtom = atom((get): SelectedPick[] => {
  const state = get(picksAtom);
  return Object.entries(state.picks)
    .map(([fixtureIdStr, pickData]) => ({
      fixtureId: Number(fixtureIdStr),
      pick: pickData.pick,
    }))
    .sort((a, b) => a.fixtureId - b.fixtureId);
});
