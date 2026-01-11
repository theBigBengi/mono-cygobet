// features/picks/picks.persistence.ts
// Single-source-of-truth persistence module for picks.
// ONLY module that accesses AsyncStorage for picks.
// No UI, no hooks, no atoms here.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PicksStorageEnvelope, PickData } from "./picks.types";

const STORAGE_KEY = "picks:v1";
const CURRENT_VERSION = 1;

/**
 * Load picks from AsyncStorage
 * Returns null if storage is empty or invalid
 * Validates minimal shape: version, picks object, valid pick data
 */
export async function loadPicksFromStorage(): Promise<PicksStorageEnvelope | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    // Validate version
    if (
      typeof parsed.version !== "number" ||
      parsed.version !== CURRENT_VERSION
    ) {
      console.warn(
        `[Picks] Invalid version: ${parsed.version}, expected ${CURRENT_VERSION} - clearing legacy data`
      );
      // Migration cleanup: delete invalid storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Validate picks is an object
    if (
      !parsed.picks ||
      typeof parsed.picks !== "object" ||
      Array.isArray(parsed.picks)
    ) {
      console.warn(
        "[Picks] Invalid picks shape: must be an object - clearing legacy data"
      );
      // Migration cleanup: delete invalid storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Validate each pick entry
    const validatedPicks: Record<string, PickData> = {};
    for (const [fixtureIdStr, pickData] of Object.entries(parsed.picks)) {
      // Keys must be strings (fixture IDs)
      if (typeof fixtureIdStr !== "string") {
        continue;
      }

      // Values must be objects with pick and kickoffTs
      if (
        !pickData ||
        typeof pickData !== "object" ||
        Array.isArray(pickData)
      ) {
        continue;
      }

      const data = pickData as any;

      // Validate pick option
      if (data.pick !== "1" && data.pick !== "X" && data.pick !== "2") {
        continue;
      }

      // Validate kickoffTs is a number
      if (typeof data.kickoffTs !== "number" || data.kickoffTs <= 0) {
        continue;
      }

      // Validated entry
      validatedPicks[fixtureIdStr] = {
        pick: data.pick,
        kickoffTs: data.kickoffTs,
        updatedAtTs:
          typeof data.updatedAtTs === "number" ? data.updatedAtTs : undefined,
      };
    }

    return {
      version: CURRENT_VERSION,
      picks: validatedPicks,
    };
  } catch (error) {
    console.error("[Picks] Error loading from storage:", error);
    return null;
  }
}

/**
 * Save picks to AsyncStorage
 * Stringify once, write once
 * Never writes partial shapes
 */
export async function savePicksToStorage(
  envelope: PicksStorageEnvelope
): Promise<void> {
  try {
    const json = JSON.stringify(envelope);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error("[Picks] Error saving to storage:", error);
    throw error;
  }
}

/**
 * Clear picks from AsyncStorage
 */
export async function clearPicksStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[Picks] Error clearing storage:", error);
    throw error;
  }
}

/**
 * Prune expired picks from envelope
 * Removes entries where kickoffTs <= nowTs
 * Returns pruned envelope (same version)
 * This is the only auto-mutation, and it happens only at bootstrap
 */
export function pruneExpiredPicks(
  envelope: PicksStorageEnvelope,
  nowTs: number
): PicksStorageEnvelope {
  const prunedPicks: Record<string, PickData> = {};

  for (const [fixtureIdStr, pickData] of Object.entries(envelope.picks)) {
    // Keep picks that haven't started yet (kickoffTs > nowTs)
    if (pickData.kickoffTs > nowTs) {
      prunedPicks[fixtureIdStr] = pickData;
    }
  }

  return {
    version: envelope.version,
    picks: prunedPicks,
  };
}
