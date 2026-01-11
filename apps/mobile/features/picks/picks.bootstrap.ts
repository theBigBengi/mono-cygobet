// features/picks/picks.bootstrap.ts
// Bootstrap function: the ONLY read path from storage.
// Idempotent: can be called multiple times safely.

import { picksAtom, picksHydratedAtom } from "./picks.store";
import {
  loadPicksFromStorage,
  savePicksToStorage,
  pruneExpiredPicks,
  clearPicksStorage,
} from "./picks.persistence";
import { jotaiStore } from "@/lib/state/jotaiStore";
import type { PicksState } from "./picks.types";

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
 * Bootstrap picks: load from storage, prune expired, hydrate atom
 * Idempotent: if already bootstrapped, returns immediately
 * This must run exactly once per app start
 */
export async function bootstrapPicks(): Promise<void> {
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
    console.log("[Picks] bootstrapPicks executed");
    console.log("[Picks] Store instance:", jotaiStore);

    try {
      const nowTs = getNowTs();

      // Load envelope from storage
      const envelope = await loadPicksFromStorage();

      if (!envelope) {
        // No data in storage: set empty state and mark as hydrated
        jotaiStore.set(picksAtom, { picks: {} });
        jotaiStore.set(picksHydratedAtom, true);
        bootstrapped = true;
        return;
      }

      // Prune expired picks
      const prunedEnvelope = pruneExpiredPicks(envelope, nowTs);

      // Check if pruning removed anything
      const wasPruned =
        Object.keys(prunedEnvelope.picks).length <
        Object.keys(envelope.picks).length;

      // Set atom with pruned picks
      const state: PicksState = { picks: prunedEnvelope.picks };
      jotaiStore.set(picksAtom, state);
      jotaiStore.set(picksHydratedAtom, true);

      // If pruning removed picks, immediately write back pruned envelope
      if (wasPruned) {
        await savePicksToStorage(prunedEnvelope);
      }

      bootstrapped = true;
    } catch (error) {
      console.error("[Picks] Bootstrap error:", error);
      // On error, clear storage and set empty state (migration cleanup for invalid data)
      try {
        await clearPicksStorage();
      } catch (clearError) {
        console.error(
          "[Picks] Error clearing storage on bootstrap error:",
          clearError
        );
      }
      jotaiStore.set(picksAtom, { picks: {} });
      jotaiStore.set(picksHydratedAtom, true);
      bootstrapped = true;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
