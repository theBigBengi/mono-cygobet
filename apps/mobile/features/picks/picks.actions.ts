// features/picks/picks.actions.ts
// Pure action helpers for picks operations.
// No UI imports here.

import { useSetAtom } from "jotai";
import { picksActionsAtom } from "./picks.store";
import type { PickOption, FixtureId } from "./picks.types";

/**
 * Toggle pick for a fixture
 * If current pick equals the new pick, removes it
 * Otherwise, sets/replaces the pick
 */
export function useTogglePick() {
  const setActions = useSetAtom(picksActionsAtom);
  return (fixtureId: FixtureId, pick: PickOption) => {
    setActions({ type: "togglePick", fixtureId, pick });
  };
}

/**
 * Clear all picks
 */
export function useClearPicks() {
  const setActions = useSetAtom(picksActionsAtom);
  return () => {
    setActions({ type: "clearAllPicks" });
  };
}

/**
 * Remove pick for a specific fixture
 */
export function useRemovePick() {
  const setActions = useSetAtom(picksActionsAtom);
  return (fixtureId: FixtureId) => {
    setActions({ type: "removePick", fixtureId });
  };
}

