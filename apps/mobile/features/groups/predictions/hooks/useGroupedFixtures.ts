import { useMemo } from "react";
import { isLive } from "@repo/utils";
import { groupFixturesByLeagueAndDateOnly } from "@/utils/fixture";
import type { LeagueDateGroup } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

/**
 * Hook to separate LIVE fixtures from others and group fixtures by league/date.
 * Returns grouped fixtures with LIVE group at the beginning if present.
 * Uses vertical layout (groups by league/date only, time is shown in card).
 * @param filteredFixtures - Array of fixtures to group
 */
export function useGroupedFixtures(
  filteredFixtures: FixtureItem[]
): LeagueDateGroup[] {
  // Separate LIVE fixtures from others
  const { liveFixtures, otherFixtures } = useMemo(() => {
    const live: FixtureItem[] = [];
    const other: FixtureItem[] = [];

    filteredFixtures.forEach((fixture) => {
      if (isLive(fixture.state)) {
        live.push(fixture);
      } else {
        other.push(fixture);
      }
    });

    return { liveFixtures: live, otherFixtures: other };
  }, [filteredFixtures]);

  // Group fixtures by league/date only (time is shown in card)
  const otherLeagueDateGroups = useMemo(() => {
    return groupFixturesByLeagueAndDateOnly(otherFixtures);
  }, [otherFixtures]);

  // Combine LIVE group with other groups for navigation
  const leagueDateGroups = useMemo(() => {
    const groups = [...otherLeagueDateGroups];

    // Add LIVE group at the beginning if there are live fixtures
    if (liveFixtures.length > 0) {
      groups.unshift({
        key: "live",
        leagueName: "Live",
        dateKey: "",
        kickoffIso: null,
        fixtures: liveFixtures,
      });
    }

    return groups;
  }, [liveFixtures, otherLeagueDateGroups]);

  return leagueDateGroups;
}
