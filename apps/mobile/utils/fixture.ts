// utils/fixture.ts
// Utility functions for fixture formatting and manipulation.

import type { ApiFixturesListResponse } from "@repo/types";

type FixtureItem = ApiFixturesListResponse["data"][0];

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
 * Format date header with optional time (e.g., "23 Jan 2026 - 19:30").
 * Returns formatted date string.
 */
export function formatDateHeader(dateKey: string, time?: string): string {
  try {
    const date = new Date(dateKey + "T00:00:00");
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const year = date.getFullYear();
    const dateStr = `${day} ${month} ${year}`;
    return time ? `${dateStr} - ${time}` : dateStr;
  } catch {
    return dateKey;
  }
}

/**
 * Format kickoff time in 24-hour format (e.g., "19:30").
 * Returns empty string if missing/null/undefined.
 * Alias for formatKickoffTime for clarity.
 */
export function formatKickoffTime24(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }

  try {
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/**
 * Group fixtures by league, date, and time.
 * Returns sorted array of groups, each containing fixtures with same league, date, and time.
 */
export type LeagueDateGroup = {
  key: string;
  leagueName: string;
  dateKey: string; // YYYY-MM-DD
  kickoffIso: string | null;
  fixtures: FixtureItem[];
};

export function groupFixturesByLeagueAndDate(
  fixtures: FixtureItem[]
): LeagueDateGroup[] {
  const grouped: Record<string, LeagueDateGroup> = {};

  // Guard against undefined or null fixtures
  if (!fixtures || !Array.isArray(fixtures)) {
    return [];
  }

  fixtures.forEach((fixture) => {
    if (!fixture.kickoffAt) return;

    const date = new Date(fixture.kickoffAt);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const leagueName = fixture.league?.name ?? "Unknown league";

    // Use league + date + time (HH:MM) as grouping key
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeKey = `${hours}:${minutes}`;
    const key = `${leagueName}|${dateKey}|${timeKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        leagueName,
        dateKey,
        kickoffIso: fixture.kickoffAt,
        fixtures: [],
      };
    }

    grouped[key].fixtures.push(fixture);
  });

  // Sort fixtures within each group by kickoff time
  Object.values(grouped).forEach((group) => {
    group.fixtures.sort((a, b) => {
      if (!a.kickoffAt || !b.kickoffAt) return 0;
      return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    });
  });

  // Sort groups chronologically, then by league name
  return Object.values(grouped).sort((a, b) => {
    const timeA = a.kickoffIso ? new Date(a.kickoffIso).getTime() : 0;
    const timeB = b.kickoffIso ? new Date(b.kickoffIso).getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.leagueName.localeCompare(b.leagueName);
  });
}
