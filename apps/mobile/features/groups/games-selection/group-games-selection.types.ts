// features/group-games-selection/group-games-selection.types.ts
// Type definitions for group games selection feature.
// Single stable storage contract with versioning.

import type { ApiFixturesListResponse } from "@repo/types";

export type FixtureId = number;

/**
 * Selected game data - full fixture object for display
 */
export type SelectedGameData = ApiFixturesListResponse["data"][0];

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
