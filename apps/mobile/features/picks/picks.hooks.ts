// features/picks/picks.hooks.ts
// React hooks for picks feature (thin wrappers).
// Screens/components should import from here.
// No storage logic, no bootstrap, no normalization here.

import { useAtomValue } from "jotai";
import {
  picksAtom,
  selectedPicksArrayAtom,
  picksCountAtom,
  hasAnyPickAtom,
  picksHydratedAtom,
} from "./picks.store";
import { togglePick, clearAllPicks } from "./picks.actions";
import type { PickOption, FixtureId, SelectedPick } from "./picks.types";

/**
 * Get the selected pick for a specific fixture
 * Returns null if no pick is selected OR if picks are not yet hydrated
 * This prevents flicker and prevents UI from showing "not selected" before hydration
 */
export function usePickForFixture(fixtureId: FixtureId): PickOption | null {
  const state = useAtomValue(picksAtom);
  const hydrated = useAtomValue(picksHydratedAtom);

  // Ready gate: don't show selected state until hydrated
  if (!hydrated) {
    return null;
  }

  const pickData = state.picks[String(fixtureId)];
  return pickData?.pick ?? null;
}

/**
 * Get toggle pick function
 * Requires fixtureId, pick, and kickoffTs
 * Hooks only expose actions - no storage logic here
 */
export function useTogglePickHook() {
  return togglePick;
}

/**
 * Get selected picks array, count, and hasAnyPick flag
 */
export function useSelectedPicks(): {
  picks: SelectedPick[];
  count: number;
  hasAnyPick: boolean;
} {
  const picks = useAtomValue(selectedPicksArrayAtom);
  const count = useAtomValue(picksCountAtom);
  const hasAnyPick = useAtomValue(hasAnyPickAtom);

  return {
    picks,
    count,
    hasAnyPick,
  };
}

/**
 * Get clear picks function
 * Hooks only expose actions - no storage logic here
 */
export function useClearPicksHook() {
  return clearAllPicks;
}

/**
 * Check if picks have been hydrated from storage
 * Useful for preventing UI flicker
 */
export function usePicksHydrated(): boolean {
  return useAtomValue(picksHydratedAtom);
}
