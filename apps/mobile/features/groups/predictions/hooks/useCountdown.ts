// useCountdown.ts
// Re-renders every minute to show "in Xh Ym" countdown for next game kickoff.

import { useState, useEffect, useCallback } from "react";

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCountdown(iso: string | null | undefined): string {
  if (!iso) return "—";
  const kickoff = new Date(iso).getTime();
  const now = Date.now();
  const diff = kickoff - now;
  if (diff <= 0) return "—";

  if (diff < MS_PER_DAY) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    if (minutes > 0) return `in ${minutes}m`;
    return "in <1m";
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

  const timeStr = kickoffDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;

  return kickoffDate.toLocaleString("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Returns a formatted countdown string for a kickoff time.
 * Re-renders every minute so "in Xh Ym" stays accurate.
 * Returns "—" when no kickoff or kickoff is in the past.
 */
export function useCountdown(
  kickoffAt: string | null | undefined
): string {
  const [label, setLabel] = useState(() => formatCountdown(kickoffAt));

  const update = useCallback(() => {
    setLabel(formatCountdown(kickoffAt));
  }, [kickoffAt]);

  useEffect(() => {
    update();
    const interval = setInterval(update, MS_PER_MINUTE);
    return () => clearInterval(interval);
  }, [update]);

  return label;
}
