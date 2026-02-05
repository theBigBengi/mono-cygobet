// useStructuralFilter.ts — Team list (teams mode) and round list (leagues mode), selected state and navigation.

import { useMemo, useState, useCallback } from "react";
import { isLive, isFinished, isNotStarted } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import { isToPredict } from "./useActionChips";

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

function getRoundStatus(fixturesInRound: FixtureItem[]): RoundStatus {
  const hasLive = fixturesInRound.some((f) => isLive(f.state));
  if (hasLive) return "live";
  const hasUnpredicted = fixturesInRound.some(isToPredict);
  if (hasUnpredicted) return "unpredicted";
  const allFinished = fixturesInRound.every((f) => isFinished(f.state));
  if (allFinished) return "settled";
  return "upcoming";
}

type SelectionMode = "games" | "teams" | "leagues";

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
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const selectTeam = useCallback((id: number | null) => {
    setSelectedTeamId(id);
  }, []);

  const selectRound = useCallback((round: string) => {
    setSelectedRound(round);
  }, []);

  const structuralFilter = useMemo((): StructuralFilter | null => {
    if (fixtures.length === 0) return null;

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
        return {
          type: "teams",
          teams,
          selectedTeamId: selectedTeamId,
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
  }, [fixtures, mode, groupTeamsIds, selectedTeamId, selectedRound]);

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

  return {
    structuralFilter,
    selectTeam,
    selectRound,
    navigateRound,
    setSelectedRound,
    setSelectedTeamId,
  };
}
