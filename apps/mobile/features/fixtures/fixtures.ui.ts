// features/fixtures/fixtures.ui.ts
// Presentation-only utilities for fixtures.
// - No React Query imports
// - No API imports
// - No auth dependencies
// - Only formatting/presentation helpers

/**
 * Format kickoff date label (e.g., "16 Apr").
 * Returns "—" if missing/null/undefined.
 */
export function formatKickoffDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

/**
 * Format kickoff time (e.g., "20:00").
 * Returns "—" if missing/null/undefined.
 */
export function formatKickoffTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  try {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/**
 * Format kickoff time from ISO string to readable format (legacy, kept for compatibility).
 * Returns "TBD" if missing/null/undefined.
 */
export function formatKickoff(iso: string | null | undefined): string {
  if (!iso) {
    return "TBD";
  }

  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "TBD";
  }
}

/**
 * Get team display name with fallback.
 * Returns safe fallback string if missing.
 */
export function getTeamDisplayName(
  teamName?: string | null,
  fallback: "Home" | "Away" = "Home"
): string {
  if (!teamName || teamName.trim() === "") {
    return fallback;
  }
  return teamName;
}

/**
 * Get teams label from home/away team names.
 * Returns safe fallback strings if missing.
 */
export function getTeamsLabel(
  home?: string | null,
  away?: string | null
): string {
  const homeName = getTeamDisplayName(home, "Home");
  const awayName = getTeamDisplayName(away, "Away");
  return `${homeName} vs ${awayName}`;
}

/**
 * Get league label from league name.
 * Returns "Unknown league" if missing.
 */
export function getLeagueLabel(leagueName?: string | null): string {
  return leagueName ?? "Unknown league";
}

/**
 * Extract odds for 1/X/2 outcomes from odds array.
 * Filters for marketExternalId = 1 (if available in the data structure),
 * sorts by sortOrder, and returns home/draw/away odds.
 * Returns placeholders ("—") if odds are missing.
 */
export function extractMatchOdds(
  odds?:
    | {
        label: string;
        value: string;
        sortOrder: number;
        marketName?: string | null;
      }[]
    | null
): {
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
