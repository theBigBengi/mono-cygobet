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
