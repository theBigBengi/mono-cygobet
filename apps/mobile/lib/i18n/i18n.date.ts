// lib/i18n/i18n.date.ts
// Locale-aware date formatters using date-fns.

import { format, isToday, isYesterday } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { Locale } from "./i18n.types";

export function getDateFnsLocale(locale: Locale) {
  return locale === "he" ? he : enUS;
}

/**
 * Format date (e.g., "Jan 15, 2026").
 */
export function formatDateLocale(date: Date, locale: Locale): string {
  return format(date, "MMM d, yyyy", { locale: getDateFnsLocale(locale) });
}

/**
 * Format date short (e.g., "16 Apr").
 */
export function formatDateShortLocale(date: Date, locale: Locale): string {
  return format(date, "d MMM", { locale: getDateFnsLocale(locale) });
}

/**
 * Format time 24h (e.g., "19:30").
 */
export function formatTime24Locale(date: Date, locale: Locale): string {
  return format(date, "HH:mm", { locale: getDateFnsLocale(locale) });
}

/**
 * Format date header with optional time (e.g., "23 Jan 2026 - 19:30").
 */
export function formatDateHeaderLocale(
  date: Date,
  locale: Locale,
  time?: string
): string {
  const dateStr = format(date, "d MMM yyyy", { locale: getDateFnsLocale(locale) });
  return time ? `${dateStr} - ${time}` : dateStr;
}

/**
 * Format chat date separator (e.g., "Today", "Yesterday", "15 Feb 2026").
 * Requires translated labels for today/yesterday.
 */
export function formatChatDateSeparator(
  date: Date,
  locale: Locale,
  labels: { today: string; yesterday: string }
): string {
  if (isToday(date)) return labels.today;
  if (isYesterday(date)) return labels.yesterday;
  return format(date, "d MMM yyyy", { locale: getDateFnsLocale(locale) });
}

/**
 * Format full kickoff datetime (e.g., "Jan 15, 2026, 7:30 PM").
 */
export function formatKickoffLocale(date: Date, locale: Locale): string {
  return format(date, "MMM d, yyyy, h:mm a", { locale: getDateFnsLocale(locale) });
}
