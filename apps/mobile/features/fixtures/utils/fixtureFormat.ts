// features/fixtures/utils/fixtureFormat.ts
// Formatting-only utilities for fixtures.
// Pure functions - no business logic, no mapping, no heuristics.

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

