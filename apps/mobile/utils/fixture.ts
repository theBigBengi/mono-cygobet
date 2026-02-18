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
  if (!iso) return i18n.t("common.tbd", { ns: "common", defaultValue: "TBD" });
  try {
    const date = new Date(iso);
    return formatKickoffLocale(date, getCurrentLocale());
  } catch {
    return i18n.t("common.tbd", { ns: "common", defaultValue: "TBD" });
  }
}

/**
 * Format kickoff date + time compact (e.g., "Wed, Feb 5 · 20:00").
 * Returns "TBD" if missing/null/undefined.
 */
export function formatKickoffDateTime(iso: string | null | undefined): string {
  if (!iso) return i18n.t("common.tbd", { ns: "common", defaultValue: "TBD" });
  try {
    const date = new Date(iso);
    const locale = getCurrentLocale();
    const dayDate = format(date, "EEE, MMM d", {
      locale: getDateFnsLocale(locale),
    });
    const time = formatTime24Locale(date, locale);
    return `${dayDate} · ${time}`;
  } catch {
    return i18n.t("common.tbd", { ns: "common", defaultValue: "TBD" });
  }
}

/**
 * Get team display name with fallback.
 * Returns safe fallback string if missing.
 */
export function getTeamDisplayName(
  teamName?: string | null,
  fallback: "home" | "away" = "home"
): string {
  if (!teamName || teamName.trim() === "") {
    return i18n.t(`common.${fallback}`, { ns: "common", defaultValue: fallback === "home" ? "Home" : "Away" });
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
  const homeName = getTeamDisplayName(home, "home");
  const awayName = getTeamDisplayName(away, "away");
  return `${homeName} vs ${awayName}`;
}

/**
 * Get league label from league name.
 * Returns "Unknown league" if missing.
 */
export function getLeagueLabel(leagueName?: string | null): string {
  return leagueName ?? i18n.t("common.unknownLeague", { ns: "common", defaultValue: "Unknown league" });
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
  countryName: string | null;
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
    const leagueName = fixture.league?.name ?? i18n.t("common.unknownLeague", { ns: "common", defaultValue: "Unknown league" });

    // Use league + date + time (HH:MM) as grouping key
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const timeKey = `${hours}:${minutes}`;
    const key = `${leagueName}|${dateKey}|${timeKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        leagueName,
        countryName: fixture.country?.name ?? null,
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
    const leagueName = fixture.league?.name ?? i18n.t("common.unknownLeague", { ns: "common", defaultValue: "Unknown league" });

    // Use league + date only (without time) as grouping key
    const key = `${leagueName}|${dateKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        leagueName,
        countryName: fixture.country?.name ?? null,
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

/**
 * Group fixtures by league only.
 * Returns sorted array of groups, each containing fixtures with same league.
 * Used when date filtering is already applied (e.g., DateSlider).
 */
export type LeagueGroup = {
  key: string;
  leagueName: string;
  leagueImagePath: string | null;
  countryName: string | null;
  countryIso2: string | null;
  fixtures: FixtureItem[];
};

export function groupFixturesByLeague(
  fixtures: FixtureItem[],
  leagueOrder?: number[]
): LeagueGroup[] {
  const grouped: Record<string, LeagueGroup> = {};

  if (!fixtures || !Array.isArray(fixtures)) {
    return [];
  }

  fixtures.forEach((fixture) => {
    const leagueName =
      fixture.league?.name ??
      i18n.t("common.unknownLeague", { ns: "common", defaultValue: "Unknown league" });
    const key = leagueName;

    if (!grouped[key]) {
      grouped[key] = {
        key,
        leagueName,
        leagueImagePath: fixture.league?.imagePath ?? null,
        countryName: fixture.country?.name ?? null,
        countryIso2: fixture.country?.iso2 ?? null,
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

  // Sort groups by league order (if provided), then by kickoff time
  if (leagueOrder && leagueOrder.length > 0) {
    const orderMap = new Map(leagueOrder.map((id, idx) => [id, idx]));
    return Object.values(grouped).sort((a, b) => {
      // Extract league ID from first fixture
      const aId = a.fixtures[0]?.league?.id;
      const bId = b.fixtures[0]?.league?.id;
      const aOrder = aId !== undefined ? orderMap.get(aId) : undefined;
      const bOrder = bId !== undefined ? orderMap.get(bId) : undefined;

      // Both ordered: by order, then kickoff
      if (aOrder !== undefined && bOrder !== undefined) {
        if (aOrder !== bOrder) return aOrder - bOrder;
        const timeA = a.fixtures[0]?.kickoffAt
          ? new Date(a.fixtures[0].kickoffAt).getTime()
          : 0;
        const timeB = b.fixtures[0]?.kickoffAt
          ? new Date(b.fixtures[0].kickoffAt).getTime()
          : 0;
        return timeA - timeB;
      }
      // One ordered: ordered first
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      // Neither: by kickoff time, then by league name
      const timeA = a.fixtures[0]?.kickoffAt
        ? new Date(a.fixtures[0].kickoffAt).getTime()
        : 0;
      const timeB = b.fixtures[0]?.kickoffAt
        ? new Date(b.fixtures[0].kickoffAt).getTime()
        : 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.leagueName.localeCompare(b.leagueName);
    });
  }

  // Default: sort groups by earliest kickoff time, then by league name
  return Object.values(grouped).sort((a, b) => {
    const timeA = a.fixtures[0]?.kickoffAt
      ? new Date(a.fixtures[0].kickoffAt).getTime()
      : 0;
    const timeB = b.fixtures[0]?.kickoffAt
      ? new Date(b.fixtures[0].kickoffAt).getTime()
      : 0;
    if (timeA !== timeB) return timeA - timeB;
    return a.leagueName.localeCompare(b.leagueName);
  });
}

/**
 * Group fixtures by date only (without league).
 * Returns sorted array of groups, each containing fixtures with same date.
 * Used for leagues mode where fixtures are already filtered by round.
 */
export type DateGroup = {
  key: string;
  dateKey: string; // YYYY-MM-DD
  kickoffIso: string | null;
  fixtures: FixtureItem[];
};

export function groupFixturesByDate(fixtures: FixtureItem[]): DateGroup[] {
  const grouped: Record<string, DateGroup> = {};

  if (!fixtures || !Array.isArray(fixtures)) {
    return [];
  }

  fixtures.forEach((fixture) => {
    if (!fixture.kickoffAt) return;

    const date = new Date(fixture.kickoffAt);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const key = dateKey;

    if (!grouped[key]) {
      grouped[key] = {
        key,
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
    // Update kickoffIso to earliest fixture
    if (group.fixtures.length > 0 && group.fixtures[0].kickoffAt) {
      group.kickoffIso = group.fixtures[0].kickoffAt;
    }
  });

  // Sort groups chronologically
  return Object.values(grouped).sort((a, b) => {
    const timeA = a.kickoffIso ? new Date(a.kickoffIso).getTime() : 0;
    const timeB = b.kickoffIso ? new Date(b.kickoffIso).getTime() : 0;
    return timeA - timeB;
  });
}

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
