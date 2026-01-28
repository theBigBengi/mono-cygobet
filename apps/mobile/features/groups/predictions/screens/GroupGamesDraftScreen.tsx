import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Screen, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUpdateGroupMutation, useGroupGamesFiltersQuery } from "@/domains/groups";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { MatchDraftCard } from "../components/MatchDraftCard";
import type { FixtureItem } from "@/types/common";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import {
  RoundFilterTabs,
  TeamsModeFilterTabs,
  GamesModeFilterTabs,
} from "../components";
import { useGroupGamesFilters } from "../hooks/useGroupGamesFilters";
import { useFilteredFixtures } from "../hooks/useFilteredFixtures";

type Props = {
  groupId: number | null;
  fixtures: FixtureItem[]; // Fixtures passed from parent (already fetched with group)
};

/**
 * Draft screen for group games.
 * Shows fixtures with remove (X) / restore (blue plus) in the middle.
 * X marks as deselected (dimmed); plus restores.
 */
export function GroupGamesDraftScreen({ groupId, fixtures: fixturesProp }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [deselectedIds, setDeselectedIds] = useState<Set<number>>(new Set());
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  
  const hasDeselectedGames = deselectedIds.size > 0;

  // Fetch games filters to check mode
  const { data: filtersData } = useGroupGamesFiltersQuery(groupId);
  const isLeaguesMode = filtersData?.data.mode === "leagues";
  const isTeamsMode = filtersData?.data.mode === "teams";
  const isGamesMode = filtersData?.data.mode === "games";
  const availableRounds = filtersData?.data.filters && "rounds" in filtersData.data.filters
    ? filtersData.data.filters.rounds
    : [];
  const availableLeagues = filtersData?.data.leagues || [];

  const toggleDeselected = useCallback((fixtureId: number, deselect: boolean) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (deselect) next.add(fixtureId);
      else next.delete(fixtureId);
      return next;
    });
  }, []);

  // Use fixtures from props (already fetched with group query)
  const fixtures = useMemo(
    () => (Array.isArray(fixturesProp) ? fixturesProp : []),
    [fixturesProp]
  );

  // Calculate filter availability
  const { hasTodayFixtures, hasThisWeekFixtures } = useGroupGamesFilters({
    fixtures,
    isTeamsMode,
    isGamesMode,
  });

  // Filter fixtures based on selected filters
  const filteredFixtures = useFilteredFixtures({
    fixtures,
    isLeaguesMode,
    isTeamsMode,
    isGamesMode,
    selectedRound,
    selectedLeagueId,
  });

  const updateGroupMutation = useUpdateGroupMutation(groupId);

  // Calculate remaining fixture IDs (all current IDs minus deselected ones)
  const remainingFixtureIds = useMemo(() => {
    return fixtures
      .map((fixture) => fixture.id)
      .filter((id) => !deselectedIds.has(id));
  }, [fixtures, deselectedIds]);

  const handleUpdateSelections = useCallback(() => {
    if (!groupId) {
      Alert.alert("Error", "Group ID is required");
      return;
    }

    if (remainingFixtureIds.length === 0) {
      Alert.alert(
        "Cannot Update",
        "You must keep at least one game in the group."
      );
      return;
    }

    updateGroupMutation.mutate(
      { fixtureIds: remainingFixtureIds },
      {
        onSuccess: () => {
          // Reset deselected IDs on success
          setDeselectedIds(new Set());
        },
        onError: (error) => {
          Alert.alert(
            "Update Failed",
            error?.message || "Failed to update group games. Please try again."
          );
        },
      }
    );
  }, [groupId, remainingFixtureIds, updateGroupMutation]);

  const leagueDateGroups = useMemo(
    () => groupFixturesByLeagueAndDate(filteredFixtures as FixtureItem[]),
    [filteredFixtures]
  );

  if (filteredFixtures.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <AppText variant="body" color="secondary">
            No games selected for this group yet.
          </AppText>
        </View>
      </Screen>
    );
  }

  const HEADER_HEIGHT = 64;

  const header = (
    <GroupGamesHeader
      viewMode="list"
      onBack={() => router.back()}
      onFillRandom={() => {
        // No functionality in draft mode
      }}
      onToggleView={() => {
        // No toggle in draft mode
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: HEADER_HEIGHT + ((isLeaguesMode && availableRounds.length > 0) || ((isTeamsMode || isGamesMode) && (availableLeagues.length > 0 || hasTodayFixtures || hasThisWeekFixtures)) ? 56 : 0),
            paddingBottom: hasDeselectedGames ? 100 : 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter tabs based on mode */}
        {isLeaguesMode && (
          <RoundFilterTabs
            availableRounds={availableRounds}
            selectedRound={selectedRound}
            onSelectRound={setSelectedRound}
          />
        )}
        {isTeamsMode && (
          <TeamsModeFilterTabs
            availableLeagues={availableLeagues}
            hasTodayFixtures={hasTodayFixtures}
            hasThisWeekFixtures={hasThisWeekFixtures}
            selectedLeagueId={selectedLeagueId}
            onSelectLeagueId={setSelectedLeagueId}
          />
        )}
        {isGamesMode && (
          <GamesModeFilterTabs
            hasTodayFixtures={hasTodayFixtures}
            hasThisWeekFixtures={hasThisWeekFixtures}
            selectedLeagueId={selectedLeagueId}
            onSelectLeagueId={setSelectedLeagueId}
          />
        )}

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

                const fixtureItem = fixture as FixtureItem;
                const isDeselected = deselectedIds.has(fixture.id);

                return (
                  <View key={fixture.id}>
                    <MatchDraftCard
                      fixture={fixtureItem}
                      positionInGroup={positionInGroup}
                      isDeselected={isDeselected}
                      onRemove={() => toggleDeselected(fixture.id, true)}
                      onRestore={() => toggleDeselected(fixture.id, false)}
                    />
                  </View>
                );
              })}
            </View>
          </LeagueDateGroupSection>
        ))}
      </ScrollView>
      <View style={[styles.headerOverlay, { top: 0 }]} pointerEvents="box-none">
        {header}
      </View>
      {/* Floating Update Button - only show when there are deselected games */}
      {hasDeselectedGames && (
        <View
          style={[
            styles.floatingButtonContainer,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              padding: theme.spacing.md,
            },
          ]}
          pointerEvents="box-none"
        >
          <Button
            label={
              updateGroupMutation.isPending
                ? "Updating..."
                : "Update Selections"
            }
            onPress={handleUpdateSelections}
            style={styles.floatingButton}
            disabled={updateGroupMutation.isPending}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 6, paddingVertical: 16 },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  groupCardContainer: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 1000,
  },
  floatingButton: {
    minWidth: 200,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  deleteButton: {
    width: "100%",
  },
});
