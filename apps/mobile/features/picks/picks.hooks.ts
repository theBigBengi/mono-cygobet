// features/picks/picks.hooks.ts
// React hooks for picks feature.
// Screens/components should import from here.

import { useAtomValue } from "jotai";
import { picksAtom, selectedPicksArrayAtom, picksCountAtom, hasAnyPickAtom } from "./picks.store";
import { useTogglePick, useClearPicks } from "./picks.actions";
import type { PickOption, FixtureId, SelectedPick } from "./picks.types";

/**
 * Get the selected pick for a specific fixture
 * Returns null if no pick is selected
 */
export function usePickForFixture(fixtureId: FixtureId): PickOption | null {
  const picks = useAtomValue(picksAtom);
  return picks[fixtureId] ?? null;
}

/**
 * Get toggle pick function
 */
export function useTogglePickHook() {
  return useTogglePick();
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
 */
export function useClearPicksHook() {
  return useClearPicks();
}

