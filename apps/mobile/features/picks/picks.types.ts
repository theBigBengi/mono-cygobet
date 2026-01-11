// features/picks/picks.types.ts
// Type definitions for picks feature.
// Single stable storage contract with versioning.

export type PickOption = "1" | "X" | "2";

export type FixtureId = number;

/**
 * Runtime model: Pick data stored in memory
 */
export interface PickData {
  pick: PickOption;
  kickoffTs: number; // Unix seconds (consistent with fixture.startTs)
  updatedAtTs?: number; // Unix seconds (optional, for future use)
}

/**
 * Runtime model: Picks state stored in Jotai atom
 * Keys are fixture IDs as strings (for consistent JSON serialization)
 */
export type PicksState = {
  picks: Record<string, PickData>;
};

/**
 * Storage envelope model: Versioned shape persisted to AsyncStorage
 * Version field enables future migrations
 */
export interface PicksStorageEnvelope {
  version: number; // Current version: 1
  picks: Record<string, PickData>;
}

/**
 * Legacy type: SelectedPick array (for compatibility with existing UI)
 */
export type SelectedPick = {
  fixtureId: number;
  pick: PickOption;
};
