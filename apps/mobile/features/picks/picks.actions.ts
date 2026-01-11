// features/picks/picks.actions.ts
// Explicit action functions for picks operations.
// Updates atom AND persists to storage (ONLY write path).
// Requires kickoffTs parameter - do not guess later.

import { picksAtom } from "./picks.store";
import { savePicksToStorage, clearPicksStorage } from "./picks.persistence";
import { jotaiStore } from "@/lib/state/jotaiStore";
import type { PickOption, FixtureId, PicksState } from "./picks.types";

/**
 * Get current timestamp in Unix seconds
 */
function getNowTs(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Toggle pick for a fixture
 * If same pick already selected → remove it
 * Else set { pick, kickoffTs, updatedAtTs }
 * Requires kickoffTs (must come from fixture data)
 */
export async function togglePick(
  fixtureId: FixtureId,
  pick: PickOption,
  kickoffTs: number
): Promise<void> {
  // Update atom first (UI updates immediately)
  const currentState = jotaiStore.get(picksAtom);
  const fixtureIdStr = String(fixtureId);
  const currentPickData = currentState.picks[fixtureIdStr];

  let newState: PicksState;

  // If same pick already selected, remove it (toggle off)
  if (currentPickData && currentPickData.pick === pick) {
    const newPicks = { ...currentState.picks };
    delete newPicks[fixtureIdStr];
    newState = { picks: newPicks };
  } else {
    // Otherwise, set/replace the pick
    const newPicks = {
      ...currentState.picks,
      [fixtureIdStr]: {
        pick,
        kickoffTs,
        updatedAtTs: getNowTs(),
      },
    };
    newState = { picks: newPicks };
  }

  // Update atom first (UI updates immediately)
  jotaiStore.set(picksAtom, newState);

  // Persist to storage (if this fails, atom is already updated, so UI still works)
  try {
    await savePicksToStorage({
      version: 1,
      picks: newState.picks,
    });
  } catch (storageError) {
    // Log storage error but don't fail the operation (atom is already updated)
    console.error(
      "[Picks] Storage save failed, but atom was updated:",
      storageError
    );
  }
}

/**
 * Clear all picks
 * Sets atom to empty and clears storage
 */
export async function clearAllPicks(): Promise<void> {
  const emptyState: PicksState = { picks: {} };

  // Update atom first
  jotaiStore.set(picksAtom, emptyState);

  // Clear storage
  await clearPicksStorage();
}
