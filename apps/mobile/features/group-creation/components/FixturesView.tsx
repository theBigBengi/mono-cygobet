// features/group-creation/components/FixturesView.tsx
// Upcoming fixtures list with league/date grouping, selection, and modal.
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiUpcomingFixturesQuery } from "@repo/types";
import { useUpcomingFixturesQuery } from "@/domains/fixtures/fixtures.hooks";
import { GameSelectionCard } from "@/features/group-creation/selection/games";
import {
  useIsGroupGameSelected,
  useToggleGroupGame,
} from "@/features/group-creation/selection/games";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import type { FixtureItem, PositionInGroup } from "@/types/common";

function GameFixtureCardWithSelection({
  fixture,
  toggleGroupGame,
  positionInGroup,
}: {
  fixture: FixtureItem;
  toggleGroupGame: (fixtureId: number, gameData: FixtureItem) => Promise<void>;
  positionInGroup?: PositionInGroup;
}) {
  const isSelected = useIsGroupGameSelected(fixture.id);

  const handlePress = () => {
    toggleGroupGame(fixture.id, fixture);
  };

  return (
    <GameSelectionCard
      fixture={fixture}
      isSelected={isSelected}
      onPress={handlePress}
      positionInGroup={positionInGroup}
    />
  );
}

interface FixturesViewProps {
  tabs?: React.ReactNode;
  queryParams?: ApiUpcomingFixturesQuery;
}

export function FixturesView({ tabs, queryParams }: FixturesViewProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const toggleGroupGame = useToggleGroupGame();

  const { data, isLoading, error, refetch } = useUpcomingFixturesQuery(
    queryParams ?? { page: 1 }
  );

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
        {tabs}
        {isLoading && (
          <AppText variant="body" color="secondary" style={styles.message}>
            Loading games…
          </AppText>
        )}

        {error && (
          <AppText variant="body" color="danger" style={styles.message}>
            {t("fixtures.errorLoadingGames", { message: error.message })}
          </AppText>
        )}

        {!isLoading && !error && leagueDateGroups.length === 0 && (
          <AppText variant="body" color="secondary" style={styles.message}>
            {t("fixtures.noUpcomingGames")}
          </AppText>
        )}

        {!isLoading && !error && leagueDateGroups.length > 0 && (
          <>
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
          </>
        )}
      </ScrollView>
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
    // paddingTop: 8,
    // paddingHorizontal: 8,
    // paddingBottom: 100,
  },
  groupCardContainer: {},
});
