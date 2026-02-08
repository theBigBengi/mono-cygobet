// features/group-creation/selection/games/bootstrap.ts
// Bootstrap function: the ONLY read path from storage.
// Idempotent: can be called multiple times safely.

import {
  selectedGroupGamesAtom,
  groupGamesHydratedAtom,
} from "./store";
import {
  loadGroupGamesFromStorage,
  saveGroupGamesToStorage,
  pruneExpiredGames,
  clearGroupGamesStorage,
} from "./persistence";
import { jotaiStore } from "@/lib/state/jotaiStore";
import type { GroupGamesState } from "./types";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

/**
 * Get current timestamp in Unix seconds
 * Uses Date.now() / 1000 for consistency with fixture.startTs
 */
function getNowTs(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Bootstrap group games: load from storage, prune expired, hydrate atom
 * Idempotent: if already bootstrapped, returns immediately
 * This must run exactly once per app start
 */
export async function bootstrapGroupGames(): Promise<void> {
  // Idempotency guard: if already bootstrapped, return immediately
  if (bootstrapped) {
    return;
  }

  // If bootstrap is in progress, wait for it
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  // Start bootstrap
  bootstrapPromise = (async () => {
    if (__DEV__) console.log("[GroupGames] bootstrapGroupGames executed");

    try {
      const nowTs = getNowTs();

      // Load envelope from storage
      const envelope = await loadGroupGamesFromStorage();

      if (!envelope) {
        // No data in storage: set empty state and mark as hydrated
        jotaiStore.set(selectedGroupGamesAtom, { games: {} });
        jotaiStore.set(groupGamesHydratedAtom, true);
        bootstrapped = true;
        return;
      }

      // Prune expired games
      const prunedEnvelope = pruneExpiredGames(envelope, nowTs);

      // Check if pruning removed anything
      const wasPruned =
        Object.keys(prunedEnvelope.games).length <
        Object.keys(envelope.games).length;

      // Set atom with pruned games
      const state: GroupGamesState = { games: prunedEnvelope.games };
      jotaiStore.set(selectedGroupGamesAtom, state);
      jotaiStore.set(groupGamesHydratedAtom, true);

      // If pruning removed games, immediately write back pruned envelope
      if (wasPruned) {
        await saveGroupGamesToStorage(prunedEnvelope);
      }

      bootstrapped = true;
    } catch (error) {
      if (__DEV__) console.error("[GroupGames] Bootstrap error:", error);
      // On error, clear storage and set empty state (migration cleanup for invalid data)
      try {
        await clearGroupGamesStorage();
      } catch (clearError) {
        console.error(
          "[GroupGames] Error clearing storage on bootstrap error:",
          clearError
        );
      }
      jotaiStore.set(selectedGroupGamesAtom, { games: {} });
      jotaiStore.set(groupGamesHydratedAtom, true);
      bootstrapped = true;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
