// useCountdown.ts
// Re-renders every minute to show "in Xh Ym" countdown for next game kickoff.

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { format } from "date-fns";
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
 * Returns a formatted countdown string for a kickoff time.
 * Re-renders every minute so "in Xh Ym" stays accurate.
 * Returns "—" when no kickoff or kickoff is in the past.
 */
export function useCountdown(
  kickoffAt: string | null | undefined
): string {
  const { t } = useTranslation("common");
  const locale = getCurrentLocale();

  const formatCountdown = useCallback(
    (iso: string | null | undefined): string => {
      if (!iso) return "—";
      const kickoff = new Date(iso).getTime();
      const now = Date.now();
      const diff = kickoff - now;
      if (diff <= 0) return "—";

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
    },
    [t, locale]
  );

  const [label, setLabel] = useState(() => formatCountdown(kickoffAt));

  const update = useCallback(() => {
    setLabel(formatCountdown(kickoffAt));
  }, [kickoffAt, formatCountdown]);

  useEffect(() => {
    update();
    const interval = setInterval(update, MS_PER_MINUTE);
    return () => clearInterval(interval);
  }, [update]);

  return label;
}
