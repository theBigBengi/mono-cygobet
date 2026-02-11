// features/group-creation/screens/CreateGroupModalFixturesView.tsx
// View for displaying selected fixtures in create group modal.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import {
  useSelectedGroupGames,
  useToggleGroupGame,
  SelectedGameCard,
} from "@/features/group-creation/selection/games";
import { groupFixturesByLeague, formatMonthDay } from "@/utils/fixture";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import { SelectionSummaryCard } from "@/features/group-creation/components/SelectionSummaryCard";

interface GroupedGame {
  fixtureId: number;
  game: FixtureItem;
}

function groupGamesByLeague(games: GroupedGame[]): {
  key: string;
  leagueName: string;
  countryName: string | null;
  fixtures: GroupedGame[];
}[] {
  const fixtures = games.map((g) => g.game);
  const leagueGroups = groupFixturesByLeague(fixtures);
  return leagueGroups.map((group) => {
    const groupedFixtures: GroupedGame[] = group.fixtures
      .map((fixture) => {
        const g = games.find((x) => x.game.id === fixture.id);
        return g ?? { fixtureId: fixture.id, game: fixture };
      })
      .filter((g): g is GroupedGame => g != null);
    return {
      key: group.key,
      leagueName: group.leagueName,
      countryName: group.countryName,
      fixtures: groupedFixtures,
    };
  });
}

export function CreateGroupModalFixturesView() {
  const { t } = useTranslation("common");
  const { games } = useSelectedGroupGames();
  const toggleGame = useToggleGroupGame();

  const groupedGames = useMemo(
    () => groupGamesByLeague(games),
    [games]
  );

  const summaryItems = useMemo(() => {
    if (games.length === 0) return [];
    const timestamps = games.map((g) => new Date(g.game.kickoffAt).getTime());
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const startDate = new Date(minTs);
    const endDate = new Date(maxTs);
    const startStr = formatMonthDay(startDate.toISOString());
    const endStr = formatMonthDay(endDate.toISOString());
    const dateRangeValue =
      minTs === maxTs ? startStr : `${startStr} - ${endStr}`;
    const leaguesCount = new Set(
      games.map((g) => g.game.league?.id).filter(Boolean)
    ).size;
    return [
      {
        icon: "event",
        label: t("fixtures.selectionSummaryDateRange"),
        value: dateRangeValue,
      },
      {
        icon: "sports-soccer",
        label: t("fixtures.selectionSummaryGames"),
        value: t("fixtures.selectionSummaryGamesCount", {
          count: games.length,
        }),
      },
      {
        icon: "emoji-events",
        label: t("fixtures.selectionSummaryLeagues"),
        value: t("fixtures.selectionSummaryLeaguesCount", {
          count: leaguesCount,
        }),
      },
    ];
  }, [games, t]);

  if (games.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noGamesSelected")}
        </AppText>
      </View>
    );
  }

  return (
    <>
      <SelectionSummaryCard items={summaryItems} />
      {groupedGames.map((group) => (
        <View key={group.key} style={styles.leagueSection}>
          <View style={styles.leagueHeader}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.leagueName}
            >
              {group.leagueName}
            </AppText>
            {group.countryName && (
              <AppText
                variant="caption"
                color="secondary"
                style={styles.countryName}
              >
                {group.countryName}
              </AppText>
            )}
          </View>
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
        </View>
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
  leagueSection: {
    marginTop: 0,
    marginHorizontal: -16,
  },
  leagueHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leagueName: {
    fontSize: 13,
    fontWeight: "500",
  },
  countryName: {
    fontSize: 11,
    marginTop: 2,
  },
  groupCards: {
    marginTop: 0,
  },
});
