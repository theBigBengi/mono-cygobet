// useStructuralFilter.ts — Team list (teams mode) and round list (leagues mode), selected state and navigation.

import { useMemo, useState, useCallback } from "react";
import { isLive, isFinished, isNotStarted, isTerminal } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import { isToPredict } from "../utils/fixture-helpers";
import type { SelectionMode } from "../types";

export type TeamChip = {
  id: number;
  name: string;
  imagePath: string | null;
};

export type CompetitionChip = {
  id: number;
  name: string;
  imagePath: string | null;
  countryName: string | null;
};

export type RoundStatus = "live" | "unpredicted" | "settled" | "upcoming";

export type RoundInfo = {
  round: string;
  count: number;
  predictedCount: number;
  status: RoundStatus;
};

export type WeekInfo = {
  key: string;
  label: string;
  startDate: string;
  count: number;
  predictedCount: number;
  status: RoundStatus;
  isCurrent: boolean;
};

export type StructuralFilter =
  | {
      type: "teams";
      teams: TeamChip[];
      selectedTeamId: number | null;
      competitions: CompetitionChip[];
      selectedCompetitionId: number | null;
    }
  | {
      type: "rounds";
      currentRound: string;
      allRounds: RoundInfo[];
      selectedRound: string;
    }
  | {
      type: "weeks";
      allWeeks: WeekInfo[];
      selectedWeek: string;
      currentWeek: string;
      teams?: TeamChip[];
      selectedTeamId?: number | null;
    };

/** Get the Monday 00:00 of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.getDate()} ${months[weekStart.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}

function getWeekKey(date: Date): string {
  const ws = getWeekStart(date);
  return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;
}

function getRoundStatus(fixturesInRound: FixtureItem[]): RoundStatus {
  const hasLive = fixturesInRound.some((f) => isLive(f.state));
  if (hasLive) return "live";
  const hasUnpredicted = fixturesInRound.some(isToPredict);
  if (hasUnpredicted) return "unpredicted";
  const allTerminal = fixturesInRound.every((f) => isTerminal(f.state));
  if (allTerminal) return "settled";
  return "upcoming";
}

interface UseStructuralFilterParams {
  fixtures: FixtureItem[];
  mode: SelectionMode;
  groupTeamsIds?: number[];
}

export function useStructuralFilter({
  fixtures,
  mode,
  groupTeamsIds,
}: UseStructuralFilterParams) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<
    number | null
  >(null);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const selectTeam = useCallback((id: number | null) => {
    setSelectedTeamId(id);
  }, []);

  const selectCompetition = useCallback((id: number | null) => {
    setSelectedCompetitionId(id);
  }, []);

  const selectRound = useCallback((round: string) => {
    setSelectedRound(round);
  }, []);

  const selectWeek = useCallback((weekKey: string) => {
    setSelectedWeek(weekKey);
  }, []);

  const structuralFilter = useMemo((): StructuralFilter | null => {
    if (fixtures.length === 0) return null;

    if (mode === "games" || mode === "teams") {
      // Compute calendar weeks
      const now = new Date();
      const currentWeekKey = getWeekKey(now);
      const weekMap = new Map<string, { start: Date; fixtures: FixtureItem[] }>();

      for (const f of fixtures) {
        if (!f.kickoffAt) continue;
        const d = new Date(f.kickoffAt);
        const key = getWeekKey(d);
        if (!weekMap.has(key)) {
          weekMap.set(key, { start: getWeekStart(d), fixtures: [] });
        }
        weekMap.get(key)!.fixtures.push(f);
      }

      const sortedKeys = Array.from(weekMap.keys()).sort();

      if (sortedKeys.length > 1) {
        const allWeeks: WeekInfo[] = sortedKeys.map((key) => {
          const entry = weekMap.get(key)!;
          const isCurrent = key === currentWeekKey;
          return {
            key,
            label: formatWeekLabel(entry.start),
            startDate: entry.start.toISOString(),
            count: entry.fixtures.length,
            predictedCount: entry.fixtures.filter((f) => f.prediction != null).length,
            status: getRoundStatus(entry.fixtures),
            isCurrent,
          };
        });

        // Default to current week, or nearest future week
        const defaultWeek =
          sortedKeys.find((k) => k >= currentWeekKey) ?? sortedKeys[sortedKeys.length - 1]!;
        const effectiveWeek = selectedWeek ?? defaultWeek;

        // For teams mode, also extract team chips
        let teams: TeamChip[] | undefined;
        let effectiveTeamId: number | null | undefined;
        if (mode === "teams") {
          const teamMap = new Map<number, TeamChip>();
          for (const f of fixtures) {
            if (f.homeTeam) {
              teamMap.set(f.homeTeam.id, { id: f.homeTeam.id, name: f.homeTeam.name, imagePath: f.homeTeam.imagePath ?? null });
            }
            if (f.awayTeam) {
              teamMap.set(f.awayTeam.id, { id: f.awayTeam.id, name: f.awayTeam.name, imagePath: f.awayTeam.imagePath ?? null });
            }
          }
          const allowedIds = new Set(groupTeamsIds ?? []);
          teams = Array.from(teamMap.values())
            .filter((t) => allowedIds.size === 0 || allowedIds.has(t.id))
            .sort((a, b) => a.name.localeCompare(b.name));
          effectiveTeamId = selectedTeamId;
        }

        return {
          type: "weeks",
          allWeeks,
          selectedWeek: effectiveWeek,
          currentWeek: currentWeekKey,
          teams,
          selectedTeamId: effectiveTeamId,
        };
      }

      return null;
    }

    if (mode === "leagues") {
      const roundMap = new Map<string, FixtureItem[]>();
      for (const f of fixtures) {
        const r = f.round ?? "";
        if (!roundMap.has(r)) roundMap.set(r, []);
        roundMap.get(r)!.push(f);
      }
      const sortedRoundKeys = Array.from(roundMap.keys())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      if (sortedRoundKeys.length > 1) {
        const allRounds: RoundInfo[] = sortedRoundKeys.map((round) => {
          const list = roundMap.get(round) ?? [];
          return {
            round,
            count: list.length,
            predictedCount: list.filter((f) => f.prediction != null).length,
            status: getRoundStatus(list),
          };
        });
        const earliestWithNs = sortedRoundKeys.find((r) =>
          (roundMap.get(r) ?? []).some((f) => isNotStarted(f.state))
        );
        const latestRound = sortedRoundKeys[sortedRoundKeys.length - 1] ?? null;
        const currentRoundForNav =
          earliestWithNs ?? latestRound ?? sortedRoundKeys[0] ?? null;
        const effectiveSelectedRound = selectedRound ?? currentRoundForNav;
        return {
          type: "rounds",
          currentRound: currentRoundForNav ?? "",
          allRounds,
          selectedRound: effectiveSelectedRound,
        };
      }
    }

    return null;
  }, [fixtures, mode, groupTeamsIds, selectedTeamId, selectedCompetitionId, selectedRound, selectedWeek]);

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

  const navigateWeek = useCallback(
    (direction: "prev" | "next") => {
      if (structuralFilter?.type !== "weeks") return;
      const keys = structuralFilter.allWeeks.map((w) => w.key);
      const idx = keys.indexOf(structuralFilter.selectedWeek);
      if (direction === "prev" && idx > 0) {
        setSelectedWeek(keys[idx - 1] ?? null);
      } else if (direction === "next" && idx >= 0 && idx < keys.length - 1) {
        setSelectedWeek(keys[idx + 1] ?? null);
      }
    },
    [structuralFilter]
  );

  return {
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound,
    navigateRound,
    selectWeek,
    navigateWeek,
    setSelectedRound,
    setSelectedTeamId,
    setSelectedCompetitionId,
    setSelectedWeek,
  };
}
