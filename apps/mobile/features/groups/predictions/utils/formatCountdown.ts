// utils/formatCountdown.ts
// Utility function to format countdown string for a kickoff time.

import { format } from "date-fns";
import i18n from "i18next";
import {
  formatTime24Locale,
  getDateFnsLocale,
} from "@/lib/i18n/i18n.date";
import type { Locale } from "@/lib/i18n/i18n.types";
import { isLocale } from "@/lib/i18n/i18n.types";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getCurrentLocale(): Locale {
  const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(lang) ? lang : "en";
}

/**
 * Formats a countdown string for a kickoff time.
 * Returns "—" when no kickoff or kickoff is in the past.
 */
export function formatCountdown(
  iso: string | null | undefined,
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  if (!iso) return "—";

  const kickoff = new Date(iso).getTime();
  const now = Date.now();
  const diff = kickoff - now;

  if (diff <= 0) return "—";

  const locale = getCurrentLocale();

  if (diff < MS_PER_DAY) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return t("countdown.inHoursMinutes", { hours, minutes });
    if (minutes > 0) return t("countdown.inMinutes", { minutes });
    return t("countdown.inLessThanMinute");
  }

  const kickoffDate = new Date(kickoff);
  const today = new Date(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    kickoffDate.getFullYear() === today.getFullYear() &&
    kickoffDate.getMonth() === today.getMonth() &&
    kickoffDate.getDate() === today.getDate();
  const isTomorrow =
    kickoffDate.getFullYear() === tomorrow.getFullYear() &&
    kickoffDate.getMonth() === tomorrow.getMonth() &&
    kickoffDate.getDate() === tomorrow.getDate();

  const timeStr = formatTime24Locale(kickoffDate, locale);

  if (isToday) return t("countdown.today", { time: timeStr });
  if (isTomorrow) return t("countdown.tomorrow", { time: timeStr });

  return format(kickoffDate, "EEE HH:mm", {
    locale: getDateFnsLocale(locale),
  });
}
