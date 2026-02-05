// Re-export common types for convenience
export type { FixtureItem } from "@/types/common";

export type PredictionMode = "CorrectScore" | "MatchWinner";

import type { GroupPrediction } from "@/features/group-creation/selection/games";

/** Predictions keyed by fixture id (string). */
export type PredictionsByFixtureId = Record<string, GroupPrediction>;

export type FocusedField = {
  fixtureId: number;
  type: "home" | "away";
} | null;
