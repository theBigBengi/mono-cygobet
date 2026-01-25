// features/home/components/HomeFixturesView.tsx
// Upcoming fixtures list with league/date grouping, selection, and modal.
// English strings only.

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useUpcomingFixturesQuery } from "@/domains/fixtures/fixtures.hooks";
import { GroupGameCard } from "@/features/groups/games-selection/components/GroupGameCard";
import {
  useIsGroupGameSelected,
  useToggleGroupGame,
} from "@/features/groups/games-selection";
import type { ApiFixturesListResponse } from "@repo/types";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";

type FixtureItem = ApiFixturesListResponse["data"][0];

function GameFixtureCardWithSelection({
  fixture,
  toggleGroupGame,
  positionInGroup,
}: {
  fixture: FixtureItem;
  toggleGroupGame: (fixtureId: number, gameData: FixtureItem) => Promise<void>;
  positionInGroup?: "single" | "top" | "middle" | "bottom";
}) {
  const isSelected = useIsGroupGameSelected(fixture.id);

  const handlePress = () => {
    toggleGroupGame(fixture.id, fixture);
  };

  return (
    <GroupGameCard
      fixture={fixture}
      isSelected={isSelected}
      onPress={handlePress}
      positionInGroup={positionInGroup}
    />
  );
}

export function HomeFixturesView() {
  const { theme } = useTheme();
  const toggleGroupGame = useToggleGroupGame();

  const { data, isLoading, error, refetch } = useUpcomingFixturesQuery({
    page: 1,
  });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const leagueDateGroups = useMemo(() => {
    const fixtures = (data?.data || []) as FixtureItem[];
    return groupFixturesByLeagueAndDate(fixtures);
  }, [data?.data]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isLoading && (
        <AppText variant="body" color="secondary" style={styles.message}>
          Loading games…
        </AppText>
      )}

      {error && (
        <AppText variant="body" color="danger" style={styles.message}>
          Error loading games: {error.message}
        </AppText>
      )}

      {!isLoading && !error && leagueDateGroups.length === 0 && (
        <AppText variant="body" color="secondary" style={styles.message}>
          No upcoming games found
        </AppText>
      )}

      {!isLoading && !error && leagueDateGroups.length > 0 && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={
                Platform.OS === "android" ? [theme.colors.primary] : undefined
              }
            />
          }
        >
          {leagueDateGroups.map((group) => (
            <LeagueDateGroupSection
              key={group.key}
              leagueName={group.leagueName}
              dateKey={group.dateKey}
              kickoffIso={group.kickoffIso}
            >
              <View style={styles.groupCardContainer}>
                {group.fixtures.map((fixture, index) => {
                  const isFirst = index === 0;
                  const isLast = index === group.fixtures.length - 1;
                  const positionInGroup =
                    group.fixtures.length === 1
                      ? "single"
                      : isFirst
                        ? "top"
                        : isLast
                          ? "bottom"
                          : "middle";

                  return (
                    <GameFixtureCardWithSelection
                      key={fixture.id}
                      toggleGroupGame={toggleGroupGame}
                      fixture={fixture}
                      positionInGroup={positionInGroup}
                    />
                  );
                })}
              </View>
            </LeagueDateGroupSection>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 8,
    paddingBottom: 100,
  },
  groupCardContainer: {},
});
