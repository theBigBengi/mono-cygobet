import { useMemo } from "react";
import { groupFixturesByRound } from "@/utils/fixture";
import type { RoundGroup } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

type SelectionMode = "games" | "teams" | "leagues";

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
  level?: "date" | "league";
  fixtures: FixtureItem[];
};

interface UseGroupedFixturesParams {
  fixtures: FixtureItem[];
  mode: SelectionMode;
  /** When true, skip grouping and return flat list (for single round view in leagues mode) */
  skipGrouping?: boolean;
  /** Team IDs to group by (for teams mode) */
  groupTeamsIds?: number[];
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
}: UseGroupedFixturesParams): FixtureGroup[] {

  // Group fixtures based on mode
  const groups = useMemo((): FixtureGroup[] => {
    let result: FixtureGroup[] = [];

    if (mode === "leagues") {
      // Leagues mode: hierarchy is Date > Round
      const getDateKey = (kickoffAt: string | undefined): string => {
        if (!kickoffAt) return "";
        const d = new Date(kickoffAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      const formatDateLabel = (kickoffAt: string | undefined): string => {
        if (!kickoffAt) return "";
        const d = new Date(kickoffAt);
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
      };

      const sortedFixtures = [...fixtures].sort((a, b) => {
        // Sort by exact kickoff time (chronological order)
        const timeA = new Date(a.kickoffAt ?? 0).getTime();
        const timeB = new Date(b.kickoffAt ?? 0).getTime();
        return timeA - timeB;
      });

      // Build groups: Date headers + Round groups
      let currentDateKey: string | null = null;
      let currentRoundKey: string | null = null;
      let currentGroup: FixtureGroup | null = null;

      for (const fixture of sortedFixtures) {
        const dateKey = getDateKey(fixture.kickoffAt);
        const round = fixture.round ?? "";
        const roundKey = `${dateKey}-${round}`;

        // Check if date changed - add date header
        if (dateKey !== currentDateKey) {
          // Push previous round group if exists
          if (currentGroup) {
            result.push(currentGroup);
            currentGroup = null;
          }
          currentDateKey = dateKey;
          // Add date header group (no fixtures, just header)
          result.push({
            key: `date-${dateKey}`,
            label: formatDateLabel(fixture.kickoffAt),
            dateKey: dateKey,
            dateLabel: formatDateLabel(fixture.kickoffAt),
            level: "date",
            fixtures: [],
          });
        }

        // Check if round changed within same date
        if (roundKey !== currentRoundKey) {
          // Push previous round group if exists
          if (currentGroup) {
            result.push(currentGroup);
          }
          currentRoundKey = roundKey;
          currentGroup = {
            key: `round-${roundKey}`,
            label: "",
            round: round || undefined,
            fixtures: [fixture],
          };
        } else {
          // Same round - add to current group
          currentGroup?.fixtures.push(fixture);
        }
      }

      // Push the last group
      if (currentGroup) {
        result.push(currentGroup);
      }
    } else {
      // Games/teams mode: hierarchy is Date > League > Round
      const getDateKey = (kickoffAt: string | undefined): string => {
        if (!kickoffAt) return "";
        const d = new Date(kickoffAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };

      const formatDateLabel = (kickoffAt: string | undefined): string => {
        if (!kickoffAt) return "";
        const d = new Date(kickoffAt);
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
      };

      const sortedFixtures = [...fixtures].sort((a, b) => {
        // 1. Sort by exact kickoff time (chronological order)
        const timeA = new Date(a.kickoffAt ?? 0).getTime();
        const timeB = new Date(b.kickoffAt ?? 0).getTime();
        if (timeA !== timeB) return timeA - timeB;

        // 2. Sort by league name (for same-time games)
        const leagueA = a.league?.name ?? "";
        const leagueB = b.league?.name ?? "";
        return leagueA.localeCompare(leagueB);
      });

      // Build groups: Date headers + League/Round groups
      let currentDateKey: string | null = null;
      let currentLeagueRoundKey: string | null = null;
      let currentGroup: FixtureGroup | null = null;
      let groupCounter = 0;

      for (const fixture of sortedFixtures) {
        const dateKey = getDateKey(fixture.kickoffAt);
        const leagueId = fixture.league?.id ?? null;
        const round = fixture.round ?? "";
        const leagueRoundKey = `${dateKey}-${leagueId}-${round}`;

        // Check if date changed - add date header
        if (dateKey !== currentDateKey) {
          // Push previous league group if exists
          if (currentGroup) {
            result.push(currentGroup);
            currentGroup = null;
          }
          currentDateKey = dateKey;
          // Add date header group (no fixtures, just header)
          result.push({
            key: `date-${dateKey}`,
            label: formatDateLabel(fixture.kickoffAt),
            dateKey: dateKey,
            dateLabel: formatDateLabel(fixture.kickoffAt),
            level: "date",
            fixtures: [],
          });
        }

        // Check if league/round changed within same date
        if (leagueRoundKey !== currentLeagueRoundKey) {
          // Push previous league group if exists
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
          // Same league/round - add to current group
          currentGroup?.fixtures.push(fixture);
        }
      }

      // Push the last group
      if (currentGroup) {
        result.push(currentGroup);
      }
    }

    return result;
  }, [fixtures, mode, skipGrouping]);

  return groups;
}

// Keep backward compatibility - export legacy function
export { useGroupedFixtures as useGroupedFixturesLegacy };
