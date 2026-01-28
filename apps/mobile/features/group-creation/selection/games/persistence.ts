// features/group-creation/selection/games/persistence.ts
// Single-source-of-truth persistence module for group games selection.
// ONLY module that accesses AsyncStorage for group games.
// No UI, no hooks, no atoms here.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  GroupGamesStorageEnvelope,
  SelectedGameData,
} from "./types";

const STORAGE_KEY = "group-games-selection:v1";
const CURRENT_VERSION = 1;

/**
 * Load group games from AsyncStorage
 * Returns null if storage is empty or invalid
 * Validates minimal shape: version, games object
 */
export async function loadGroupGamesFromStorage(): Promise<GroupGamesStorageEnvelope | null> {
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
        `[GroupGames] Invalid version: ${parsed.version}, expected ${CURRENT_VERSION} - clearing legacy data`
      );
      // Migration cleanup: delete invalid storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Validate games is an object
    if (
      !parsed.games ||
      typeof parsed.games !== "object" ||
      Array.isArray(parsed.games)
    ) {
      console.warn(
        "[GroupGames] Invalid games shape: must be an object - clearing legacy data"
      );
      // Migration cleanup: delete invalid storage
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Validate each game entry - minimal validation (just check it's an object with id)
    const validatedGames: Record<string, SelectedGameData> = {};
    for (const [fixtureIdStr, gameData] of Object.entries(parsed.games)) {
      // Keys must be strings (fixture IDs)
      if (typeof fixtureIdStr !== "string") {
        continue;
      }

      // Values must be objects with at least an id
      if (
        !gameData ||
        typeof gameData !== "object" ||
        Array.isArray(gameData)
      ) {
        continue;
      }

      const data = gameData as any;

      // Validate id is a number
      if (typeof data.id !== "number" || data.id <= 0) {
        continue;
      }

      // Validated entry - store as-is (full fixture data)
      validatedGames[fixtureIdStr] = data as SelectedGameData;
    }

    return {
      version: CURRENT_VERSION,
      games: validatedGames,
    };
  } catch (error) {
    console.error("[GroupGames] Error loading from storage:", error);
    return null;
  }
}

/**
 * Save group games to AsyncStorage
 * Stringify once, write once
 * Never writes partial shapes
 */
export async function saveGroupGamesToStorage(
  envelope: GroupGamesStorageEnvelope
): Promise<void> {
  try {
    const json = JSON.stringify(envelope);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error("[GroupGames] Error saving to storage:", error);
    throw error;
  }
}

/**
 * Clear group games from AsyncStorage
 */
export async function clearGroupGamesStorage(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[GroupGames] Error clearing storage:", error);
    throw error;
  }
}

/**
 * Prune expired games from envelope
 * Removes entries where startTs <= nowTs (game has already started)
 * Returns pruned envelope (same version)
 * This is the only auto-mutation, and it happens only at bootstrap
 */
export function pruneExpiredGames(
  envelope: GroupGamesStorageEnvelope,
  nowTs: number
): GroupGamesStorageEnvelope {
  const prunedGames: Record<string, SelectedGameData> = {};

  for (const [fixtureIdStr, gameData] of Object.entries(envelope.games)) {
    // Keep games that haven't started yet (startTs > nowTs)
    // startTs is Unix seconds from the fixture data
    if (gameData.startTs && gameData.startTs > nowTs) {
      prunedGames[fixtureIdStr] = gameData;
    } else if (!gameData.startTs) {
      // If no startTs, keep it (shouldn't happen, but be safe)
      prunedGames[fixtureIdStr] = gameData;
    }
  }

  return {
    version: envelope.version,
    games: prunedGames,
  };
}
