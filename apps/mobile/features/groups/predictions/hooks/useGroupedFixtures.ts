import { useMemo } from "react";
import type { FixtureItem } from "@/types/common";
import type { SelectionMode } from "../types";

/**
 * Unified group type for fixture sections.
 * Can represent either league-based or date-based grouping.
 */
export type FixtureGroup = {
  key: string;
  /** Display label for section header */
  label: string;
  /** Optional secondary label (e.g., country name) */
  secondaryLabel?: string | null;
  /** Date key for date-based groups */
  dateKey?: string;
  /** Formatted date for display */
  dateLabel?: string;
  /** Round for round-based groups */
  round?: string;
  /** League image for league-based groups */
  leagueImagePath?: string | null;
  /** Whether this is a LIVE section */
  isLive?: boolean;
  /** Grouping level: date > league > round */
  level?: "date" | "league" | "round";
  fixtures: FixtureItem[];
};

function getDateKey(kickoffAt: string | undefined): string {
  if (!kickoffAt) return "";
  const d = new Date(kickoffAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(kickoffAt: string | undefined): string {
  if (!kickoffAt) return "";
  const d = new Date(kickoffAt);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

export type LeaguesGroupBy = "round" | "date";

interface UseGroupedFixturesParams {
  fixtures: FixtureItem[];
  mode: SelectionMode;
  /** When true, skip grouping and return flat list (for single round view in leagues mode) */
  skipGrouping?: boolean;
  /** Team IDs to group by (for teams mode) */
  groupTeamsIds?: number[];
  /** For leagues mode: group by round or date */
  leaguesGroupBy?: LeaguesGroupBy;
}

/**
 * Hook to group fixtures based on selection mode.
 * - leagues mode: Groups by date only (league/country not shown in header)
 * - teams/games mode: Groups by league (current behavior)
 * LIVE fixtures stay in their original position (not moved to top).
 */
export function useGroupedFixtures({
  fixtures,
  mode,
  skipGrouping = false,
  groupTeamsIds,
  leaguesGroupBy = "round",
}: UseGroupedFixturesParams): FixtureGroup[] {

  const groups = useMemo((): FixtureGroup[] => {
    let result: FixtureGroup[] = [];

    if (mode === "leagues" && leaguesGroupBy === "date") {
      // Leagues mode grouped by date
      const sortedFixtures = [...fixtures].sort((a, b) => {
        const timeA = new Date(a.kickoffAt ?? 0).getTime();
        const timeB = new Date(b.kickoffAt ?? 0).getTime();
        return timeA - timeB;
      });

      let currentDateKey: string | null = null;
      let currentGroup: FixtureGroup | null = null;

      for (const fixture of sortedFixtures) {
        const dateKey = getDateKey(fixture.kickoffAt);

        if (dateKey !== currentDateKey) {
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentDateKey = dateKey;
          currentGroup = {
            key: `date-${dateKey}`,
            label: formatDateLabel(fixture.kickoffAt),
            dateKey,
            dateLabel: formatDateLabel(fixture.kickoffAt),
            level: "date",
            fixtures: [fixture],
          };
        } else {
          currentGroup?.fixtures.push(fixture);
        }
      }

      if (currentGroup) {
        result.push(currentGroup);
      }
    } else if (mode === "leagues") {
      // Leagues mode: group by round
      const sortedFixtures = [...fixtures].sort((a, b) => {
        const timeA = new Date(a.kickoffAt ?? 0).getTime();
        const timeB = new Date(b.kickoffAt ?? 0).getTime();
        return timeA - timeB;
      });

      let currentRound: string | null = null;
      let currentGroup: FixtureGroup | null = null;

      for (const fixture of sortedFixtures) {
        const round = fixture.round ?? "";

        if (round !== currentRound) {
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentRound = round;
          currentGroup = {
            key: `round-${round}`,
            label: round ? `Round ${round}` : "",
            round: round || undefined,
            level: "round",
            fixtures: [fixture],
          };
        } else {
          currentGroup?.fixtures.push(fixture);
        }
      }

      if (currentGroup) {
        result.push(currentGroup);
      }
    } else {
      // Games/teams mode: hierarchy is Date > League > Round
      const sortedFixtures = [...fixtures].sort((a, b) => {
        const timeA = new Date(a.kickoffAt ?? 0).getTime();
        const timeB = new Date(b.kickoffAt ?? 0).getTime();
        if (timeA !== timeB) return timeA - timeB;

        const leagueA = a.league?.name ?? "";
        const leagueB = b.league?.name ?? "";
        return leagueA.localeCompare(leagueB);
      });

      let currentDateKey: string | null = null;
      let currentLeagueRoundKey: string | null = null;
      let currentGroup: FixtureGroup | null = null;
      let groupCounter = 0;

      for (const fixture of sortedFixtures) {
        const dateKey = getDateKey(fixture.kickoffAt);
        const leagueId = fixture.league?.id ?? null;
        const round = fixture.round ?? "";
        const leagueRoundKey = `${dateKey}-${leagueId}-${round}`;

        if (dateKey !== currentDateKey) {
          if (currentGroup) {
            result.push(currentGroup);
            currentGroup = null;
          }
          currentDateKey = dateKey;
          result.push({
            key: `date-${dateKey}`,
            label: formatDateLabel(fixture.kickoffAt),
            dateKey: dateKey,
            dateLabel: formatDateLabel(fixture.kickoffAt),
            level: "date",
            fixtures: [],
          });
        }

        if (leagueRoundKey !== currentLeagueRoundKey) {
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentLeagueRoundKey = leagueRoundKey;
          groupCounter++;
          currentGroup = {
            key: `league-${leagueRoundKey}-${groupCounter}`,
            label: fixture.league?.name ?? "",
            secondaryLabel: fixture.country?.name ?? null,
            round: round || undefined,
            leagueImagePath: fixture.league?.imagePath ?? null,
            level: "league",
            fixtures: [fixture],
          };
        } else {
          currentGroup?.fixtures.push(fixture);
        }
      }

      if (currentGroup) {
        result.push(currentGroup);
      }
    }

    return result;
  }, [fixtures, mode, skipGrouping, leaguesGroupBy]);

  return groups;
}
