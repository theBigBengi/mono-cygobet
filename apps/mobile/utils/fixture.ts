// utils/fixture.ts
// Utility functions for fixture formatting and manipulation.

import { format } from "date-fns";
import i18n from "i18next";
import type { FixtureItem } from "@/types/common";
import {
  formatDateShortLocale,
  formatTime24Locale,
  formatDateHeaderLocale,
  formatKickoffLocale,
  getDateFnsLocale,
} from "@/lib/i18n/i18n.date";
import type { Locale } from "@/lib/i18n/i18n.types";
import { isLocale } from "@/lib/i18n/i18n.types";

function getCurrentLocale(): Locale {
  const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(lang) ? lang : "en";
}

/**
 * Format date as month + day (e.g., "Jan 15") for range display.
 * Returns "—" if missing/null/undefined.
 */
export function formatMonthDay(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const locale = getCurrentLocale();
    return format(date, "MMM d", { locale: getDateFnsLocale(locale) });
  } catch {
    return "—";
  }
}

/**
 * Format kickoff date label (e.g., "16 Apr").
 * Returns "—" if missing/null/undefined.
 */
export function formatKickoffDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return formatDateShortLocale(date, getCurrentLocale());
  } catch {
    return "—";
  }
}

/**
 * Format kickoff time (e.g., "20:00").
 * Returns "—" if missing/null/undefined.
 */
export function formatKickoffTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return formatTime24Locale(date, getCurrentLocale());
  } catch {
    return "—";
  }
}

/**
 * Format kickoff time from ISO string to readable format (legacy, kept for compatibility).
 * Returns "TBD" if missing/null/undefined.
 */
export function formatKickoff(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  try {
    const date = new Date(iso);
    return formatKickoffLocale(date, getCurrentLocale());
  } catch {
    return "TBD";
  }
}

/**
 * Format kickoff date + time compact (e.g., "Wed, Feb 5 · 20:00").
 * Returns "TBD" if missing/null/undefined.
 */
export function formatKickoffDateTime(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  try {
    const date = new Date(iso);
    const locale = getCurrentLocale();
    const dayDate = format(date, "EEE, MMM d", {
      locale: getDateFnsLocale(locale),
    });
    const time = formatTime24Locale(date, locale);
    return `${dayDate} · ${time}`;
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
    return formatDateHeaderLocale(date, getCurrentLocale(), time);
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
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return formatTime24Locale(date, getCurrentLocale());
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
    if (timeA !== timeB) return timeA - timeB;
    return a.leagueName.localeCompare(b.leagueName);
  });
}

/**
 * Group fixtures by league and date only (without time).
 * Returns sorted array of groups, each containing fixtures with same league and date.
 * Used for vertical card layout where time is displayed in the card itself.
 */
export function groupFixturesByLeagueAndDateOnly(
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

    // Use league + date only (without time) as grouping key
    const key = `${leagueName}|${dateKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        leagueName,
        dateKey,
        kickoffIso: fixture.kickoffAt, // Use first fixture's kickoff time for sorting
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
    // Update kickoffIso to the earliest fixture in the group for sorting
    if (group.fixtures.length > 0 && group.fixtures[0].kickoffAt) {
      group.kickoffIso = group.fixtures[0].kickoffAt;
    }
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

/**
 * Group fixtures by round.
 * Returns sorted array of groups, each containing fixtures with same round.
 */
export type RoundGroup = {
  key: string;
  round: string;
  kickoffIso: string | null;
  fixtures: FixtureItem[];
};

export function groupFixturesByRound(fixtures: FixtureItem[]): RoundGroup[] {
  const grouped: Record<string, RoundGroup> = {};

  // Guard against undefined or null fixtures
  if (!fixtures || !Array.isArray(fixtures)) {
    return [];
  }

  fixtures.forEach((fixture) => {
    const round = fixture.round ?? "No round";
    const key = round;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        round,
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

  // Sort groups by round (try to parse as number, otherwise alphabetically)
  return Object.values(grouped).sort((a, b) => {
    const roundA = a.round;
    const roundB = b.round;

    // Try to parse as numbers
    const numA = parseInt(roundA, 10);
    const numB = parseInt(roundB, 10);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // If both are not numbers, sort alphabetically
    if (isNaN(numA) && isNaN(numB)) {
      return roundA.localeCompare(roundB);
    }

    // Numbers come before non-numbers
    return isNaN(numA) ? 1 : -1;
  });
}
