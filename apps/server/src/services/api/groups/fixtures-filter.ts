// groups/fixtures-filter.ts
// Pure filter helpers for group fixtures. Used by getGroupById and getGroupFixtures.

import type { ApiFixturesListResponse } from "@repo/types";
import type { GroupFixturesFilter } from "../../../types/groups";

type FixtureItem = ApiFixturesListResponse["data"][0];

/**
 * Extract numeric round from fixture.round (DB: string, e.g. "33", "Round 33", "Matchday 5").
 */
function extractRoundNumber(roundStr: string | null | undefined): number | undefined {
  if (roundStr == null || typeof roundStr !== "string") return undefined;
  const s = roundStr.trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  if (!isNaN(n)) return n;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function normalizeStage(s: string): string {
  return s.replace(/\s+/g, "");
}

function hasAnyFilter(f: GroupFixturesFilter): boolean {
  return (
    (f.next != null && f.next >= 1) ||
    f.nearestDateOnly === true ||
    (f.leagueIds != null && f.leagueIds.length > 0) ||
    (f.teamIds != null && f.teamIds.length > 0) ||
    (f.fromTs != null) ||
    (f.toTs != null) ||
    (f.states != null && f.states.length > 0) ||
    (f.stages != null && f.stages.length > 0) ||
    (f.rounds != null && f.rounds.length > 0)
  );
}

/**
 * Apply filters to a list of fixtures (API shape).
 * Order: league/team/date/state/stage/round -> nearestDate -> sort -> next N.
 */
export function applyGroupFixturesFilter(
  fixtures: FixtureItem[],
  filter: GroupFixturesFilter
): FixtureItem[] {
  if (!hasAnyFilter(filter)) {
    return fixtures;
  }

  let result = fixtures;

  if (filter.leagueIds != null && filter.leagueIds.length > 0) {
    const set = new Set(filter.leagueIds);
    result = result.filter((f) => f.league != null && set.has(f.league.id));
  }

  if (filter.teamIds != null && filter.teamIds.length > 0) {
    const set = new Set(filter.teamIds);
    result = result.filter((f) => {
      const home = f.homeTeam?.id;
      const away = f.awayTeam?.id;
      return (home != null && set.has(home)) || (away != null && set.has(away));
    });
  }

  if (filter.fromTs != null || filter.toTs != null) {
    const from = filter.fromTs ?? -Infinity;
    const to = filter.toTs ?? Infinity;
    result = result.filter((f) => f.startTs >= from && f.startTs <= to);
  }

  if (filter.states != null && filter.states.length > 0) {
    const set = new Set(filter.states.map((s) => String(s)));
    result = result.filter((f) => set.has(String(f.state)));
  }

  if (
    (filter.stages != null && filter.stages.length > 0) ||
    (filter.rounds != null && filter.rounds.length > 0)
  ) {
    const stagesSet =
      filter.stages != null && filter.stages.length > 0
        ? new Set(filter.stages.map((s) => normalizeStage(s)))
        : null;
    const roundsSet =
      filter.rounds != null && filter.rounds.length > 0
        ? new Set(filter.rounds)
        : null;

    result = result.filter((f) => {
      const stage = f.stage ?? "";
      const roundNum = extractRoundNumber(f.round);
      if (stagesSet != null) {
        const normalized = normalizeStage(stage);
        if (!normalized || !stagesSet.has(normalized)) return false;
      }
      if (roundsSet != null) {
        if (roundNum == null || !roundsSet.has(roundNum)) return false;
      }
      return true;
    });
  }

  if (filter.nearestDateOnly) {
    if (result.length === 0) return result;
    const dateKey = (f: FixtureItem) => {
      const ts = f.startTs;
      if (typeof ts !== "number") return "";
      const d = new Date(ts * 1000);
      return d.toISOString().split("T")[0] ?? "";
    };
    const byDate = new Map<string, FixtureItem[]>();
    for (const f of result) {
      const k = dateKey(f);
      if (!byDate.has(k)) byDate.set(k, []);
      byDate.get(k)!.push(f);
    }
    const sortedDates = Array.from(byDate.keys()).sort();
    const earliest = sortedDates[0];
    result = earliest != null ? byDate.get(earliest) ?? [] : [];
  }

  result = [...result].sort((a, b) => (a.startTs ?? 0) - (b.startTs ?? 0));

  if (filter.next != null && filter.next >= 1) {
    result = result.slice(0, filter.next);
  }

  return result;
}
