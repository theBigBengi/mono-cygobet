import type { ApiFixturesListResponse } from "@repo/types";

export type FixtureItem = ApiFixturesListResponse["data"][0];

export type FocusedField = {
  fixtureId: number;
  type: "home" | "away";
} | null;
