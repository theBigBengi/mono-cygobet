// features/group-creation/screens/CreateGroupModalFixturesView.tsx
// View for displaying selected fixtures in create group modal.

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedGroupGames,
  useToggleGroupGame,
} from "@/features/group-creation/selection/games";
import { SelectedGameCard } from "@/features/group-creation/selection/games";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import type { FixtureItem, PositionInGroup } from "@/types/common";

interface GroupedGame {
  fixtureId: number;
  game: FixtureItem;
}

function groupGroupedGamesByLeagueAndDate(
  games: GroupedGame[]
): {
  key: string;
  leagueName: string;
  dateKey: string;
  kickoffIso: string | null;
  fixtures: GroupedGame[];
}[] {
  const fixtures = games.map((g) => g.game);
  const leagueDateGroups = groupFixturesByLeagueAndDate(fixtures);
  return leagueDateGroups.map((group) => {
    const groupedFixtures: GroupedGame[] = group.fixtures
      .map((fixture) => {
        const g = games.find((x) => x.game.id === fixture.id);
        return g ?? { fixtureId: fixture.id, game: fixture };
      })
      .filter((g): g is GroupedGame => g != null);
    return {
      key: group.key,
      leagueName: group.leagueName,
      dateKey: group.dateKey,
      kickoffIso: group.kickoffIso,
      fixtures: groupedFixtures,
    };
  });
}

export function CreateGroupModalFixturesView() {
  const { theme } = useTheme();
  const { games } = useSelectedGroupGames();
  const toggleGame = useToggleGroupGame();

  const groupedGames = useMemo(
    () => groupGroupedGamesByLeagueAndDate(games),
    [games]
  );

  if (games.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          No games selected
        </AppText>
      </View>
    );
  }

  return (
    <>
      {groupedGames.map((group) => (
        <LeagueDateGroupSection
          key={group.key}
          leagueName={group.leagueName}
          dateKey={group.dateKey}
          kickoffIso={group.kickoffIso}
        >
          <View style={styles.groupCards}>
            {group.fixtures.map(({ fixtureId, game }, i) => {
              const n = group.fixtures.length;
              const pos: PositionInGroup =
                n === 1
                  ? "single"
                  : i === 0
                    ? "top"
                    : i === n - 1
                      ? "bottom"
                      : "middle";
              return (
                <SelectedGameCard
                  key={fixtureId}
                  fixture={game}
                  positionInGroup={pos}
                  onRemove={() => toggleGame(fixtureId, game)}
                />
              );
            })}
          </View>
        </LeagueDateGroupSection>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  groupCards: {
    marginTop: 4,
  },
});
