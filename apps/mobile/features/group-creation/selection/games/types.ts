// features/group-creation/selection/games/types.ts
// Type definitions for group games selection feature.
// Single stable storage contract with versioning.

import type { FixtureId, FixtureItem } from "@/types/common";

// Re-export for convenience
export type { FixtureId };

/**
 * Selected game data - full fixture object for display
 */
export type SelectedGameData = FixtureItem;

/**
 * Runtime model: Group games state stored in Jotai atom
 * Keys are fixture IDs as strings (for consistent JSON serialization)
 */
export type GroupGamesState = {
  games: Record<string, SelectedGameData>;
};

/**
 * Storage envelope model: Versioned shape persisted to AsyncStorage
 * Version field enables future migrations
 */
export interface GroupGamesStorageEnvelope {
  version: number; // Current version: 1
  games: Record<string, SelectedGameData>;
}

/**
 * Group prediction for a single fixture
 * home and away scores (null if not set)
 */
export type GroupPrediction = {
  home: number | null;
  away: number | null;
};

/**
 * Storage envelope model for group predictions
 * Versioned shape persisted to AsyncStorage per group
 */
export interface GroupPredictionsStorageEnvelope {
  version: number; // Current version: 1
  predictions: Record<string, GroupPrediction>; // Key: fixtureId as string
}
