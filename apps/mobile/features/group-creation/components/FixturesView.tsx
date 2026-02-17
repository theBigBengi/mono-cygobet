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
  Pressable,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiUpcomingFixturesQuery } from "@repo/types";
import { useUpcomingFixturesQuery } from "@/domains/fixtures/fixtures.hooks";
import { GameSelectionCard } from "@/features/group-creation/selection/games";
import {
  useIsGroupGameSelected,
  useToggleGroupGame,
  useAddMultipleGroupGames,
  useRemoveMultipleGroupGames,
  useAreAllGamesSelected,
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

function LeagueAddRemoveButton({ fixtures }: { fixtures: FixtureItem[] }) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const addMultipleGroupGames = useAddMultipleGroupGames();
  const removeMultipleGroupGames = useRemoveMultipleGroupGames();

  const fixtureIds = useMemo(() => fixtures.map((f) => f.id), [fixtures]);
  const allSelected = useAreAllGamesSelected(fixtureIds);

  // Don't show button if only one game
  if (fixtures.length <= 1) {
    return null;
  }

  const handlePress = () => {
    if (allSelected) {
      removeMultipleGroupGames(fixtureIds);
    } else {
      addMultipleGroupGames(
        fixtures.map((f) => ({ fixtureId: f.id, gameData: f }))
      );
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.addAllButton,
        {
          opacity: pressed ? 0.5 : 1,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <MaterialIcons
        name={allSelected ? "remove" : "add"}
        size={16}
        color={theme.colors.textSecondary}
      />
      <AppText variant="caption" color="secondary" style={styles.addAllText}>
        {allSelected
          ? t("groupCreation.removeAll")
          : t("groupCreation.addAll")}
      </AppText>
    </Pressable>
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
        contentContainerStyle={[
          styles.scrollContent,
          (isLoading || leagueGroups.length === 0) && styles.scrollContentLoading,
        ]}
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          </View>
        )}

        {error && (
          <AppText variant="body" color="danger" style={styles.message}>
            {t("fixtures.errorLoadingGames", { message: error.message })}
          </AppText>
        )}

        {!isLoading && !error && leagueGroups.length === 0 && (
          <View style={styles.emptyContainer}>
            <AppText variant="body" color="secondary" style={styles.emptyText}>
              {t("fixtures.noGamesForDate")}
            </AppText>
          </View>
        )}

        {!isLoading && !error && leagueGroups.length > 0 && (
          <>
            {leagueGroups.map((group) => (
              <View key={group.key} style={styles.leagueSection}>
                <View style={styles.leagueHeader}>
                  <View style={styles.leagueInfo}>
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.leagueName}
                    >
                      {group.leagueName}
                      {group.countryIso2 && ` (${group.countryIso2.toUpperCase()})`}
                    </AppText>
                  </View>
                  <LeagueAddRemoveButton fixtures={group.fixtures} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentLoading: {
    flexGrow: 1,
  },
  leagueSection: {
    marginTop: 0,
  },
  leagueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 13,
    fontWeight: "500",
  },
  addAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  addAllText: {
    fontSize: 11,
    marginStart: 2,
  },
  groupCardContainer: {},
});
