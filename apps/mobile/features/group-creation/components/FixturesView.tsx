// features/group-creation/components/FixturesView.tsx
// Upcoming fixtures list with league/date grouping, selection, and modal.
import React, { useCallback, useMemo, useState, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText, TeamLogo } from "@/components/ui";
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
import { FilterSheet } from "@/features/group-creation/filters/FilterSheet";
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
          backgroundColor: allSelected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: allSelected
            ? theme.colors.primary
            : theme.colors.border,
          borderBottomColor: allSelected
            ? theme.colors.primary
            : theme.colors.textSecondary + "40",
          shadowColor: allSelected ? theme.colors.primary : "#000",
          shadowOpacity: pressed ? 0 : allSelected ? 0.25 : 0.08,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <MaterialIcons
        name={allSelected ? "remove" : "add"}
        size={14}
        color={allSelected ? "#fff" : theme.colors.primary}
      />
      <AppText
        variant="caption"
        style={[
          styles.addAllText,
          { color: allSelected ? "#fff" : theme.colors.primary },
        ]}
      >
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
  const insets = useSafeAreaInsets();
  const toggleGroupGame = useToggleGroupGame();

  // Calculate tab bar space to ensure content isn't hidden
  const tabBarHeight = 60 + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm;
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;
  const filters = useFixtureFilters();
  const filterSheetRef = useRef<BottomSheetModal>(null);
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
          { paddingBottom: totalTabBarSpace + theme.spacing.md },
          (isLoading || leagueGroups.length === 0) && styles.scrollContentLoading,
        ]}
        stickyHeaderIndices={[1]}
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
        <View style={{ backgroundColor: theme.colors.background }}>
          <DateSlider
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </View>
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
                  <View style={styles.leagueLogoContainer}>
                    <TeamLogo
                      imagePath={group.leagueImagePath}
                      teamName={group.leagueName}
                      size={22}
                    />
                  </View>
                  <View style={styles.leagueInfo}>
                    <AppText
                      variant="caption"
                      style={[styles.leagueName, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {group.leagueName}
                    </AppText>
                    {group.countryName && (
                      <AppText
                        variant="caption"
                        color="secondary"
                        style={styles.countryName}
                        numberOfLines={1}
                      >
                        {group.countryName}
                      </AppText>
                    )}
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

      {/* Filter FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          filterSheetRef.current?.present();
        }}
        style={({ pressed }) => [
          styles.filterFab,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor: pressed
              ? theme.colors.border
              : theme.colors.textSecondary + "40",
            shadowOpacity: pressed ? 0 : 0.15,
            transform: [{ scale: pressed ? 0.92 : 1 }],
            bottom: totalTabBarSpace + theme.spacing.md,
          },
        ]}
      >
        <Ionicons
          name="options-outline"
          size={22}
          color={theme.colors.textPrimary}
        />
      </Pressable>

      <FilterSheet
        sheetRef={filterSheetRef}
        selectedLeagueIds={filters.selectedLeagueIds}
        onApply={(ids) => {
          filters.setLeagues(ids);
          filterSheetRef.current?.dismiss();
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
    // paddingBottom is set dynamically in the component
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  leagueLogoContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 13,
    fontWeight: "600",
  },
  countryName: {
    fontSize: 11,
    marginTop: 1,
  },
  addAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  addAllText: {
    fontSize: 11,
    fontWeight: "600",
    marginStart: 4,
  },
  groupCardContainer: {},
  filterFab: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
});
