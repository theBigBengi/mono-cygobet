// hooks/useSmartFilters.ts
// Smart dynamic filters — Layer 1 (action chips) + Layer 2 (structural: teams/rounds).
// Auto-selection, stale recovery, urgency for Predict, empty state with suggestions.

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { isLive, isFinished, isNotStarted } from "@repo/utils";
import type { FixtureItem } from "@/types/common";

export type ActionChip = {
  id: string;
  label: string;
  count: number;
  urgency?: "normal" | "warning" | "urgent" | "critical";
};

export type TeamChip = {
  id: number;
  name: string;
  imagePath: string | null;
};

export type RoundStatus = "live" | "unpredicted" | "settled" | "upcoming";

export type RoundInfo = {
  round: string;
  count: number;
  status: RoundStatus;
};

export type StructuralFilter =
  | {
      type: "teams";
      teams: TeamChip[];
      selectedTeamId: number | null;
    }
  | {
      type: "rounds";
      currentRound: string;
      allRounds: RoundInfo[];
      selectedRound: string;
    };

export type EmptyStateInfo = {
  message: string;
  suggestion?: { label: string; action: () => void };
};

type SelectionMode = "games" | "teams" | "leagues";

interface UseSmartFiltersProps {
  fixtures: FixtureItem[];
  mode: SelectionMode;
  /** Team IDs the group follows (teams mode). Used to filter team avatar chips. Fallback: show all teams from fixtures if empty/missing. */
  groupTeamsIds?: number[];
  /** Called when user taps "Check the leaderboard" in empty state (all games completed). */
  onNavigateToLeaderboard?: () => void;
}

function getTimeBuckets() {
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

function classifyFixtureTime(
  kickoffAt: string | undefined,
  buckets: ReturnType<typeof getTimeBuckets>
): "today" | "tomorrow" | "this-week" | null {
  if (!kickoffAt) return null;
  const d = new Date(kickoffAt);
  if (d >= buckets.startOfToday && d <= buckets.endOfToday) return "today";
  if (d >= buckets.startOfTomorrow && d <= buckets.endOfTomorrow) return "tomorrow";
  if (d >= buckets.startOfThisWeek && d <= buckets.endOfWeek) return "this-week";
  return null;
}

function isToPredict(f: FixtureItem): boolean {
  return f.prediction == null && isNotStarted(f.state);
}

function formatNextDate(kickoffAt: string): string {
  const d = new Date(kickoffAt);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

function getRoundStatus(fixturesInRound: FixtureItem[]): RoundStatus {
  const hasLive = fixturesInRound.some((f) => isLive(f.state));
  if (hasLive) return "live";
  const hasUnpredicted = fixturesInRound.some(isToPredict);
  if (hasUnpredicted) return "unpredicted";
  const allFinished = fixturesInRound.every((f) => isFinished(f.state));
  if (allFinished) return "settled";
  return "upcoming";
}

export function useSmartFilters({ fixtures, mode, groupTeamsIds, onNavigateToLeaderboard }: UseSmartFiltersProps) {
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const userHasChangedSelection = useRef(false);
  const hasAutoSelectedRef = useRef(false);

  const selectAction = useCallback((id: string) => {
    userHasChangedSelection.current = true;
    setSelectedAction(id);
  }, []);

  const selectTeam = useCallback((id: number | null) => {
    setSelectedTeamId(id);
  }, []);

  const selectRound = useCallback((round: string) => {
    setSelectedRound(round);
  }, []);

  const buckets = useMemo(() => getTimeBuckets(), []);

  const {
    actionChips,
    structuralFilter,
    filteredFixtures,
    hasAnyChips,
    emptyState,
    roundListForPicker,
    currentRoundForNav,
  } = useMemo(() => {
    const total = fixtures.length;
    if (total === 0) {
      return {
        actionChips: [] as ActionChip[],
        structuralFilter: null as StructuralFilter | null,
        filteredFixtures: [] as FixtureItem[],
        hasAnyChips: false,
        emptyState: null as EmptyStateInfo | null,
        roundListForPicker: [] as RoundInfo[],
        currentRoundForNav: null as string | null,
      };
    }

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

    const toPredictTodayCount = toPredictFixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;

    const nearestUnpredictedKickoff =
      toPredictFixtures.length > 0
        ? (() => {
            const sorted = [...toPredictFixtures].sort(
              (a, b) => new Date(a.kickoffAt ?? 0).getTime() - new Date(b.kickoffAt ?? 0).getTime()
            );
            return sorted[0]?.kickoffAt ?? null;
          })()
        : null;
    const predictUrgency = getPredictUrgency(nearestUnpredictedKickoff);

    const nextFixture = (() => {
      const ns = fixtures.filter((f) => isNotStarted(f.state));
      if (ns.length === 0) return null;
      return ns.sort(
        (a, b) => new Date(a.kickoffAt ?? 0).getTime() - new Date(b.kickoffAt ?? 0).getTime()
      )[0] ?? null;
    })();
    const nextFixtureKickoff = nextFixture?.kickoffAt ?? null;

    const showSmartTime =
      (todayCount > 0 && todayCount < total) ||
      (tomorrowCount > 0 && tomorrowCount < total) ||
      (thisWeekCount > 0 && thisWeekCount < total) ||
      (nextFixtureKickoff != null);

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
        (f) => isNotStarted(f.state) && f.kickoffAt && new Date(f.kickoffAt).getTime() >= nextTs
      ).length;
      smartTimeLabel = `Next: ${formatNextDate(nextFixtureKickoff)} (${smartTimeCount})`;
    } else {
      smartTimeId = "";
      smartTimeLabel = "";
      smartTimeCount = 0;
    }

    const actionChips: ActionChip[] = [];
    const otherChipCount =
      (liveCount > 0 ? 1 : 0) +
      (toPredictCount > 0 && toPredictCount < total ? 1 : 0) +
      (showSmartTime && smartTimeId ? 1 : 0) +
      (resultsCount > 0 && resultsCount < total ? 1 : 0);
    if (otherChipCount > 0) {
      actionChips.push({ id: "all", label: `All (${total})`, count: total });
    }
    if (liveCount > 0) {
      actionChips.push({ id: "live", label: `Live (${liveCount})`, count: liveCount });
    }
    if (toPredictCount > 0 && toPredictCount < total) {
      const isUrgent = predictUrgency === "urgent" || predictUrgency === "critical";
      actionChips.push({
        id: "predict",
        label: isUrgent ? `Predict Now! (${toPredictCount})` : `Predict (${toPredictCount})`,
        count: toPredictCount,
        urgency: predictUrgency,
      });
    }
    // When Predict is urgent/critical, skip "Today" chip so only "Predict Now!" is shown
    const isUrgentPredict = predictUrgency === "urgent" || predictUrgency === "critical";
    const predictChipShown = toPredictCount > 0 && toPredictCount < total;
    const skipTodayChip =
      smartTimeId === "time:today" && isUrgentPredict && predictChipShown;
    if (showSmartTime && smartTimeId && !skipTodayChip) {
      actionChips.push({
        id: smartTimeId,
        label: smartTimeLabel,
        count: smartTimeCount,
      });
    }
    if (resultsCount > 0 && resultsCount < total) {
      actionChips.push({
        id: "results",
        label: `Results (${resultsCount})`,
        count: resultsCount,
      });
    }
    const limitedChips = actionChips.slice(0, 5);

    let structuralFilter: StructuralFilter | null = null;
    let roundListForPicker: RoundInfo[] = [];
    let currentRoundForNav: string | null = null;

    if (mode === "teams") {
      const teamMap = new Map<number, TeamChip>();
      for (const f of fixtures) {
        if (f.homeTeam) {
          teamMap.set(f.homeTeam.id, {
            id: f.homeTeam.id,
            name: f.homeTeam.name,
            imagePath: f.homeTeam.imagePath ?? null,
          });
        }
        if (f.awayTeam) {
          teamMap.set(f.awayTeam.id, {
            id: f.awayTeam.id,
            name: f.awayTeam.name,
            imagePath: f.awayTeam.imagePath ?? null,
          });
        }
      }
      const allowedIds = new Set(groupTeamsIds ?? []);
      const teams = Array.from(teamMap.values())
        .filter((t) => allowedIds.size === 0 || allowedIds.has(t.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (teams.length > 1) {
        structuralFilter = {
          type: "teams",
          teams,
          selectedTeamId: selectedTeamId,
        };
      }
    } else if (mode === "leagues") {
      const roundMap = new Map<string, FixtureItem[]>();
      for (const f of fixtures) {
        const r = f.round ?? "";
        if (!roundMap.has(r)) roundMap.set(r, []);
        roundMap.get(r)!.push(f);
      }
      const sortedRoundKeys = Array.from(roundMap.keys()).filter(Boolean).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      if (sortedRoundKeys.length > 1) {
        const allRounds: RoundInfo[] = sortedRoundKeys.map((round) => {
          const list = roundMap.get(round) ?? [];
          return {
            round,
            count: list.length,
            status: getRoundStatus(list),
          };
        });
        roundListForPicker = allRounds;
        const earliestWithNs = sortedRoundKeys.find((r) =>
          (roundMap.get(r) ?? []).some((f) => isNotStarted(f.state))
        );
        const latestRound = sortedRoundKeys[sortedRoundKeys.length - 1] ?? null;
        currentRoundForNav = earliestWithNs ?? latestRound ?? sortedRoundKeys[0] ?? null;
        const effectiveSelectedRound = selectedRound ?? currentRoundForNav;
        structuralFilter = {
          type: "rounds",
          currentRound: currentRoundForNav ?? "",
          allRounds,
          selectedRound: effectiveSelectedRound,
        };
      }
    }

    function applyActionFilter(list: FixtureItem[], actionId: string): FixtureItem[] {
      if (actionId === "all") return list;
      if (actionId === "live") return list.filter((f) => isLive(f.state));
      if (actionId === "predict") return list.filter(isToPredict);
      if (actionId === "results") return list.filter((f) => isFinished(f.state));
      if (actionId === "time:today") {
        return list.filter((f) => classifyFixtureTime(f.kickoffAt, buckets) === "today");
      }
      if (actionId === "time:tomorrow") {
        return list.filter((f) => classifyFixtureTime(f.kickoffAt, buckets) === "tomorrow");
      }
      if (actionId === "time:this-week") {
        return list.filter((f) => classifyFixtureTime(f.kickoffAt, buckets) === "this-week");
      }
      if (actionId === "time:next" && nextFixture?.kickoffAt) {
        const t = new Date(nextFixture.kickoffAt).getTime();
        return list.filter((f) => {
          const k = f.kickoffAt ? new Date(f.kickoffAt).getTime() : 0;
          return k >= t && isNotStarted(f.state);
        });
      }
      return list;
    }

    let afterAction = applyActionFilter(fixtures, selectedAction);

    if (structuralFilter) {
      if (structuralFilter.type === "teams" && structuralFilter.selectedTeamId != null) {
        const tid = structuralFilter.selectedTeamId;
        afterAction = afterAction.filter(
          (f) => f.homeTeam?.id === tid || f.awayTeam?.id === tid
        );
      } else if (structuralFilter.type === "rounds") {
        const r = structuralFilter.selectedRound;
        afterAction = afterAction.filter((f) => f.round === r);
      }
    }

    const filteredFixtures = [...afterAction].sort(
      (a, b) => new Date(a.kickoffAt ?? 0).getTime() - new Date(b.kickoffAt ?? 0).getTime()
    );

    const hasAnyChips = limitedChips.length > 0;

    let emptyState: EmptyStateInfo | null = null;
    if (filteredFixtures.length === 0 && total > 0) {
      const allFinished = resultsCount === total;
      if (allFinished) {
        emptyState = {
          message: "All games completed!",
          suggestion: {
            label: "Check the leaderboard →",
            action: () => onNavigateToLeaderboard?.(),
          },
        };
      } else {
        emptyState = {
          message:
            selectedAction === "live"
              ? "No live games right now."
              : selectedAction === "predict"
                ? "No games to predict in this filter."
                : "No fixtures match this filter.",
          suggestion:
            toPredictCount > 0
              ? { label: `${toPredictCount} games to predict →`, action: () => selectAction("predict") }
              : { label: "Show all →", action: () => selectAction("all") },
        };
      }
    }

    return {
      actionChips: limitedChips,
      structuralFilter,
      filteredFixtures,
      hasAnyChips,
      emptyState,
      roundListForPicker,
      currentRoundForNav,
    };
  }, [
    fixtures,
    mode,
    groupTeamsIds,
    selectedAction,
    selectedTeamId,
    selectedRound,
    buckets,
    selectAction,
    onNavigateToLeaderboard,
  ]);

  const navigateRound = useCallback(
    (direction: "prev" | "next") => {
      if (structuralFilter?.type !== "rounds") return;
      const rounds = structuralFilter.allRounds.map((r) => r.round);
      const current = structuralFilter.selectedRound;
      const idx = rounds.indexOf(current);
      if (direction === "prev" && idx > 0) {
        setSelectedRound(rounds[idx - 1] ?? null);
      } else if (direction === "next" && idx >= 0 && idx < rounds.length - 1) {
        setSelectedRound(rounds[idx + 1] ?? null);
      }
    },
    [structuralFilter]
  );

  useEffect(() => {
    if (fixtures.length === 0 || userHasChangedSelection.current || hasAutoSelectedRef.current)
      return;
    hasAutoSelectedRef.current = true;
    const liveCount = fixtures.filter((f) => isLive(f.state)).length;
    const toPredictCount = fixtures.filter(isToPredict).length;
    const toPredictTodayCount = fixtures.filter(
      (f) => isToPredict(f) && classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const todayCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const total = fixtures.length;

    if (liveCount > 0) {
      setSelectedAction("live");
      return;
    }
    if (toPredictCount > 0 && toPredictTodayCount > 0) {
      setSelectedAction("predict");
      if (mode === "leagues") {
        const roundWithToday = fixtures
          .filter((f) => classifyFixtureTime(f.kickoffAt, buckets) === "today")
          .map((f) => f.round)
          .filter(Boolean)[0];
        if (roundWithToday) setSelectedRound(roundWithToday);
      }
      return;
    }
    if (toPredictCount > 0 && toPredictCount < total) {
      setSelectedAction("predict");
      return;
    }
    if (todayCount > 0 && todayCount < total) {
      setSelectedAction("time:today");
      return;
    }
    setSelectedAction("all");
  }, [fixtures, mode, buckets]);

  useEffect(() => {
    if (filteredFixtures.length > 0 || fixtures.length === 0) return;
    // If already on "all" with 0 results, structural filter may be narrowing to nothing — clear it so "all" shows all fixtures and avoid re-trigger loop
    if (selectedAction === "all") {
      setSelectedRound(null);
      setSelectedTeamId(null);
      return;
    }
    const liveCount = fixtures.filter((f) => isLive(f.state)).length;
    const toPredictCount = fixtures.filter(isToPredict).length;
    const resultsCount = fixtures.filter((f) => isFinished(f.state)).length;
    const todayCount = fixtures.filter(
      (f) => classifyFixtureTime(f.kickoffAt, buckets) === "today"
    ).length;
    const todayChipId = actionChips.find((c) => c.id === "time:today")?.id;

    // Priority: live > results > predict > today > all. When switching to "all", clear structural filter so "all" shows every fixture.
    if (liveCount > 0) {
      setSelectedAction("live");
    } else if (resultsCount > 0) {
      setSelectedAction("results");
    } else if (toPredictCount > 0 && toPredictCount < fixtures.length) {
      setSelectedAction("predict");
    } else if (todayCount > 0 && todayCount < fixtures.length && todayChipId) {
      setSelectedAction(todayChipId);
    } else {
      setSelectedRound(null);
      setSelectedTeamId(null);
      setSelectedAction("all");
    }
  }, [filteredFixtures.length, fixtures.length, fixtures, actionChips, buckets, selectedAction]);

  return {
    actionChips,
    selectedAction,
    selectAction,
    structuralFilter,
    selectTeam,
    selectRound,
    navigateRound,
    filteredFixtures,
    hasAnyChips,
    emptyState,
  };
}
