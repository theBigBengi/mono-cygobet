// features/group-creation/selection/games/actions.ts
// Explicit action functions for group games operations.
// Updates atom AND persists to storage (ONLY write path).

import { selectedGroupGamesAtom } from "./store";
import {
  saveGroupGamesToStorage,
  clearGroupGamesStorage,
} from "./persistence";
import { jotaiStore } from "@/lib/state/jotaiStore";
import type {
  FixtureId,
  GroupGamesState,
  SelectedGameData,
} from "./types";

/**
 * Toggle game selection for a fixture
 * If game already selected → remove it
 * Else set the game data
 */
export async function toggleGroupGame(
  fixtureId: FixtureId,
  gameData: SelectedGameData
): Promise<void> {
  // Update atom first (UI updates immediately)
  const currentState = jotaiStore.get(selectedGroupGamesAtom);
  const fixtureIdStr = String(fixtureId);
  const currentGameData = currentState.games[fixtureIdStr];

  let newState: GroupGamesState;

  // If game already selected, remove it (toggle off)
  if (currentGameData) {
    const newGames = { ...currentState.games };
    delete newGames[fixtureIdStr];
    newState = { games: newGames };
  } else {
    // Otherwise, set/replace the game
    const newGames = {
      ...currentState.games,
      [fixtureIdStr]: gameData,
    };
    newState = { games: newGames };
  }

  // Update atom first (UI updates immediately)
  jotaiStore.set(selectedGroupGamesAtom, newState);

  // Persist to storage (if this fails, atom is already updated, so UI still works)
  try {
    await saveGroupGamesToStorage({
      version: 1,
      games: newState.games,
    });
  } catch (storageError) {
    // Log storage error but don't fail the operation (atom is already updated)
    console.error(
      "[GroupGames] Storage save failed, but atom was updated:",
      storageError
    );
  }
}

/**
 * Clear all selected games
 * Sets atom to empty and clears storage
 */
export async function clearSelectedGroupGames(): Promise<void> {
  const emptyState: GroupGamesState = { games: {} };

  // Update atom first
  jotaiStore.set(selectedGroupGamesAtom, emptyState);

  // Clear storage
  await clearGroupGamesStorage();
}
