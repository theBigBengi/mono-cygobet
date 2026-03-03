// Re-export common types for convenience
export type { FixtureItem } from "@/types/common";

export type PredictionMode = "CorrectScore" | "MatchWinner";

export type SelectionMode = "games" | "teams" | "leagues";

import type { GroupPrediction } from "@/features/group-creation/selection/games";

/** Predictions keyed by fixture id (string). */
export type PredictionsByFixtureId = Record<string, GroupPrediction>;

export type FocusedField = {
  fixtureId: number;
  type: "home" | "away";
} | null;

/** A single element in the flat render list (header or card). */
export type RenderItem =
  | {
      type: "header";
      key: string;
      label: string;
      level?: "date" | "league";
      isLive?: boolean;
      round?: string | number;
      showTrack: boolean;
      isFilled: boolean;
    }
  | {
      type: "card";
      fixture: FixtureItem;
      group: { fixtures: FixtureItem[] };
      indexInGroup: number;
      timelineFilled: boolean;
      timelineConnectorFilled: boolean;
      isFirstInTimeline: boolean;
      isLastInTimeline: boolean;
    };
