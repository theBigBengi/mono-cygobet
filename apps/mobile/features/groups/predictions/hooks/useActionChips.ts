// useActionChips.ts — Action chip generation (All, Live, Predict, time chips, Results) and selected action state.

import { useMemo, useState, useCallback, useRef } from "react";
import { isLive, isFinished, isNotStarted } from "@repo/utils";
import type { FixtureItem } from "@/types/common";

export type ActionChip = {
  id: string;
  label: string;
  count: number;
  urgency?: "normal" | "warning" | "urgent" | "critical";
};

export function getTimeBuckets() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfTomorrow = new Date(now);
  startOfTomorrow.setDate(now.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setHours(23, 59, 59, 999);

  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() + 2);
  startOfThisWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysUntilSunday = 7 - dayOfWeek;
  endOfWeek.setDate(now.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startOfToday,
    endOfToday,
    startOfTomorrow,
    endOfTomorrow,
    startOfThisWeek,
    endOfWeek,
    now,
  };
}

export function classifyFixtureTime(
  kickoffAt: string | undefined,
  buckets: ReturnType<typeof getTimeBuckets>
): "today" | "tomorrow" | "this-week" | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (d >= buckets.startOfToday && d <= buckets.endOfToday) return "today";
  if (d >= buckets.startOfTomorrow && d <= buckets.endOfTomorrow)
    return "tomorrow";
  if (d >= buckets.startOfThisWeek && d <= buckets.endOfWeek)
    return "this-week";
  return null;
}

export function isToPredict(f: FixtureItem): boolean {
  return f.prediction == null && isNotStarted(f.state);
}

function formatNextDate(kickoffAt: string): string {
  const d = new Date(kickoffAt);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function getPredictUrgency(
  nearestKickoffAt: string | null
): "normal" | "warning" | "urgent" | "critical" {
  if (!nearestKickoffAt) return "normal";
  const kickoff = new Date(nearestKickoffAt).getTime();
  const now = Date.now();
  const ms1h = 60 * 60 * 1000;
  const ms24h = 24 * ms1h;
  const ms15min = 15 * 60 * 1000;
  const diff = kickoff - now;
  if (diff < ms15min) return "critical";
  if (diff < ms1h) return "urgent";
  if (diff < ms24h) return "warning";
  return "normal";
}

export function useActionChips(fixtures: FixtureItem[]) {
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const userHasChangedSelection = useRef(false);
  const hasAutoSelectedRef = useRef(false);

  const selectAction = useCallback((id: string) => {
    userHasChangedSelection.current = true;
    setSelectedAction(id);
  }, []);

  const buckets = useMemo(() => getTimeBuckets(), []);

  const actionChips = useMemo(() => {
    const total = fixtures.length;
    if (total === 0) return [] as ActionChip[];

    const liveCount = fixtures.filter((f) => isLive(f.state)).length;
    const toPredictFixtures = fixtures.filter(isToPredict);
    const toPredictCount = toPredictFixtures.length;
    const resultsCount = fixtures.filter((f) => isFinished(f.state)).length;
    const todayCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const tomorrowCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "tomorrow"
    ).length;
    const thisWeekCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "this-week"
    ).length;

    const nearestUnpredictedKickoff =
      toPredictFixtures.length > 0
        ? (() => {
            const sorted = [...toPredictFixtures].sort(
              (a, b) =>
                new Date(a.kickoffAt ?? 0).getTime() -
                new Date(b.kickoffAt ?? 0).getTime()
            );
            return sorted[0]?.kickoffAt ?? null;
          })()
        : null;
    const predictUrgency = getPredictUrgency(nearestUnpredictedKickoff);

    const nextFixture = (() => {
      const ns = fixtures.filter((f) => isNotStarted(f.state));
      if (ns.length === 0) return null;
      return (
        ns.sort(
          (a, b) =>
            new Date(a.kickoffAt ?? 0).getTime() -
            new Date(b.kickoffAt ?? 0).getTime()
        )[0] ?? null
      );
    })();
    const nextFixtureKickoff = nextFixture?.kickoffAt ?? null;

    const showSmartTime =
      (todayCount > 0 && todayCount < total) ||
      (tomorrowCount > 0 && tomorrowCount < total) ||
      (thisWeekCount > 0 && thisWeekCount < total) ||
      nextFixtureKickoff != null;

    let smartTimeId: string;
    let smartTimeLabel: string;
    let smartTimeCount: number;
    if (todayCount > 0 && todayCount < total) {
      smartTimeId = "time:today";
      smartTimeLabel = `Today (${todayCount})`;
      smartTimeCount = todayCount;
    } else if (tomorrowCount > 0 && tomorrowCount < total) {
      smartTimeId = "time:tomorrow";
      smartTimeLabel = `Tomorrow (${tomorrowCount})`;
      smartTimeCount = tomorrowCount;
    } else if (thisWeekCount > 0 && thisWeekCount < total) {
      smartTimeId = "time:this-week";
      smartTimeLabel = `This Week (${thisWeekCount})`;
      smartTimeCount = thisWeekCount;
    } else if (nextFixtureKickoff) {
      smartTimeId = "time:next";
      const nextTs = new Date(nextFixtureKickoff).getTime();
      smartTimeCount = fixtures.filter(
        (f) =>
          isNotStarted(f.state) &&
          f.kickoffAt &&
          new Date(f.kickoffAt).getTime() >= nextTs
      ).length;
      smartTimeLabel = `Next: ${formatNextDate(nextFixtureKickoff)} (${smartTimeCount})`;
    } else {
      smartTimeId = "";
      smartTimeLabel = "";
      smartTimeCount = 0;
    }

    const chips: ActionChip[] = [];
    const otherChipCount =
      (liveCount > 0 ? 1 : 0) +
      (toPredictCount > 0 && toPredictCount < total ? 1 : 0) +
      (showSmartTime && smartTimeId ? 1 : 0) +
      (resultsCount > 0 && resultsCount < total ? 1 : 0);
    if (otherChipCount > 0) {
      chips.push({ id: "all", label: `All (${total})`, count: total });
    }
    if (liveCount > 0) {
      chips.push({
        id: "live",
        label: `Live (${liveCount})`,
        count: liveCount,
      });
    }
    if (toPredictCount > 0 && toPredictCount < total) {
      const isUrgent =
        predictUrgency === "urgent" || predictUrgency === "critical";
      chips.push({
        id: "predict",
        label: isUrgent
          ? `Predict Now! (${toPredictCount})`
          : `Predict (${toPredictCount})`,
        count: toPredictCount,
        urgency: predictUrgency,
      });
    }
    const isUrgentPredict =
      predictUrgency === "urgent" || predictUrgency === "critical";
    const predictChipShown = toPredictCount > 0 && toPredictCount < total;
    const skipTodayChip =
      smartTimeId === "time:today" && isUrgentPredict && predictChipShown;
    if (showSmartTime && smartTimeId && !skipTodayChip) {
      chips.push({
        id: smartTimeId,
        label: smartTimeLabel,
        count: smartTimeCount,
      });
    }
    if (resultsCount > 0 && resultsCount < total) {
      chips.push({
        id: "results",
        label: `Results (${resultsCount})`,
        count: resultsCount,
      });
    }
    return chips.slice(0, 5);
  }, [fixtures, buckets]);

  return {
    actionChips,
    selectedAction,
    selectAction,
    setSelectedAction,
    buckets,
    hasAutoSelectedRef,
    userHasChangedSelection,
  };
}
