// features/picks/picks.store.ts
// Jotai store for picks state management.
// Single source of truth for all picks.

import { atom } from "jotai";
import type { PicksMap, PickOption, FixtureId, SelectedPick } from "./picks.types";

/**
 * Main picks atom - holds the map of fixtureId -> pick
 */
export const picksAtom = atom<PicksMap>({});

/**
 * Derived atom: count of selected fixtures
 */
export const picksCountAtom = atom((get) => {
  const picks = get(picksAtom);
  return Object.keys(picks).length;
});

/**
 * Derived atom: array of selected picks, sorted by fixtureId
 */
export const selectedPicksArrayAtom = atom((get): SelectedPick[] => {
  const picks = get(picksAtom);
  return Object.entries(picks)
    .map(([fixtureId, pick]) => ({
      fixtureId: Number(fixtureId),
      pick: pick as PickOption,
    }))
    .sort((a, b) => a.fixtureId - b.fixtureId);
});

/**
 * Derived atom: boolean indicating if any picks exist
 */
export const hasAnyPickAtom = atom((get) => {
  const picks = get(picksAtom);
  return Object.keys(picks).length > 0;
});

/**
 * Write-only action atom for picks operations
 */
export const picksActionsAtom = atom(
  null,
  (
    get,
    set,
    action:
      | { type: "togglePick"; fixtureId: FixtureId; pick: PickOption }
      | { type: "clearAllPicks" }
      | { type: "removePick"; fixtureId: FixtureId }
  ) => {
    const picks = get(picksAtom);
    const newPicks = { ...picks };

    switch (action.type) {
      case "togglePick": {
        const { fixtureId, pick } = action;
        // If current pick equals the new pick, remove it (toggle off)
        if (newPicks[fixtureId] === pick) {
          delete newPicks[fixtureId];
        } else {
          // Otherwise, set/replace the pick
          newPicks[fixtureId] = pick;
        }
        break;
      }
      case "clearAllPicks": {
        // Clear all picks
        Object.keys(newPicks).forEach((key) => {
          delete newPicks[Number(key)];
        });
        break;
      }
      case "removePick": {
        // Remove specific pick
        delete newPicks[action.fixtureId];
        break;
      }
    }

    set(picksAtom, newPicks);
  }
);

