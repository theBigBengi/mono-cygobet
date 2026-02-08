// utils/date.ts
// Utility functions for date formatting and manipulation.

import i18n from "i18next";
import { formatDateLocale } from "@/lib/i18n/i18n.date";
import type { Locale } from "@/lib/i18n/i18n.types";
import { isLocale } from "@/lib/i18n/i18n.types";

function getCurrentLocale(): Locale {
  const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(lang) ? lang : "en";
}

/**
 * Formats a date string to a readable format (e.g., "Jan 15, 2026").
 * @param dateString - ISO date string (e.g., "2026-01-15")
 * @returns Formatted date string (e.g., "Jan 15, 2026")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return formatDateLocale(date, getCurrentLocale());
}

/**
 * Formats a date string as relative time (e.g., "now", "5m", "2h", "3d", or short date).
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return i18n.t("time.now", { ns: "common", defaultValue: "now" });
  if (diffMinutes < 60) return i18n.t("time.minutesShort", { ns: "common", defaultValue: "{{count}}m", count: diffMinutes });
  if (diffHours < 24) return i18n.t("time.hoursShort", { ns: "common", defaultValue: "{{count}}h", count: diffHours });
  if (diffDays < 7) return i18n.t("time.daysShort", { ns: "common", defaultValue: "{{count}}d", count: diffDays });

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
