// Re-export common types for convenience
export type { FixtureItem } from "@/types/common";

export type FocusedField = {
  fixtureId: number;
  type: "home" | "away";
} | null;
