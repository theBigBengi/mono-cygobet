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
import { groupFixturesByLeague } from "@/utils/fixture";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import { useFixtureFilters } from "@/features/group-creation/filters/useFixtureFilters";
import { FilterDrawer } from "@/features/group-creation/filters/FilterDrawer";
import { DateSlider } from "./DateSlider";

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
  const filters = useFixtureFilters();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const mergedParams = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return {
      ...(queryParams ?? {}),
      ...filters.queryParams,
      from: start.toISOString(),
      to: end.toISOString(),
      page: 1,
    };
  }, [queryParams, filters.queryParams, selectedDate]);

  const { data, isLoading, error, refetch } =
    useUpcomingFixturesQuery(mergedParams);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const leagueGroups = useMemo(() => {
    const fixtures = (data?.data || []) as FixtureItem[];
    return groupFixturesByLeague(fixtures);
  }, [data?.data]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
        <DateSlider
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
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

        {!isLoading && !error && leagueGroups.length === 0 && (
          <AppText variant="body" color="secondary" style={styles.message}>
            {t("fixtures.noUpcomingGames")}
          </AppText>
        )}

        {!isLoading && !error && leagueGroups.length > 0 && (
          <>
            {leagueGroups.map((group) => (
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
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <FilterDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        selectedLeagueIds={filters.selectedLeagueIds}
        onApply={(ids) => {
          filters.setLeagues(ids);
        }}
        onClear={filters.clearLeagues}
      />
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
    paddingBottom: 100,
  },
  leagueSection: {
    marginTop: 0,
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
  groupCardContainer: {},
});
