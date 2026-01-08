// features/fixtures/utils/fixtureOdds.ts
// Odds extraction and mapping logic for fixtures.
// Contains business heuristics for matching odds to outcomes (1/X/2).

import type { ApiFixturesListResponse } from "@repo/types";

type FixtureItem = ApiFixturesListResponse["data"][0];

/**
 * Extract odds for 1/X/2 outcomes from odds array.
 * Filters for marketExternalId = 1 (if available in the data structure),
 * sorts by sortOrder, and returns home/draw/away odds.
 * Returns placeholders ("—") if odds are missing.
 *
 * Business logic:
 * - Tries to match by label first (most reliable: "1", "X", "2", "Home", "Draw", "Away")
 * - Falls back to sortOrder position if labels don't match
 * - Assumes 3 odds sorted by sortOrder represent 1/X/2 in order
 */
export function extractMatchOdds(odds?: FixtureItem["odds"]): {
  home: string;
  draw: string;
  away: string;
} {
  if (!odds || odds.length === 0) {
    return { home: "—", draw: "—", away: "—" };
  }

  // Sort odds by sortOrder (server already filters for marketExternalId = 1)
  // For match odds (1X2), sortOrder typically: 0 = Home (1), 1 = Draw (X), 2 = Away (2)
  const sortedOdds = [...odds].sort((a, b) => a.sortOrder - b.sortOrder);

  // Try to find by label first (most reliable)
  let homeOdd = sortedOdds.find(
    (o) => o.label?.trim() === "1" || o.label?.trim() === "Home"
  );
  let drawOdd = sortedOdds.find(
    (o) => o.label?.trim() === "X" || o.label?.trim() === "Draw"
  );
  let awayOdd = sortedOdds.find(
    (o) => o.label?.trim() === "2" || o.label?.trim() === "Away"
  );

  // Fallback: if we have exactly 3 odds sorted by sortOrder, assume they're 1/X/2 in order
  if (!homeOdd && sortedOdds.length >= 1) {
    homeOdd = sortedOdds[0];
  }
  if (!drawOdd && sortedOdds.length >= 2) {
    drawOdd = sortedOdds[1];
  }
  if (!awayOdd && sortedOdds.length >= 3) {
    awayOdd = sortedOdds[2];
  }

  return {
    home: homeOdd?.value ?? "—",
    draw: drawOdd?.value ?? "—",
    away: awayOdd?.value ?? "—",
  };
}
