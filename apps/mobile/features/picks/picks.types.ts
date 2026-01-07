// features/picks/picks.types.ts
// Type definitions for picks feature.

export type PickOption = "1" | "X" | "2";

export type FixtureId = number;

export type PicksMap = Record<FixtureId, PickOption>;

export type SelectedPick = {
  fixtureId: number;
  pick: PickOption;
};

