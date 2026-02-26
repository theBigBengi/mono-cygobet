import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGroupGamesFiltersQuery,
  useUpdateGroupMutation,
} from "@/domains/groups";
import { MatchDraftCard } from "../components/MatchDraftCard";
import type { FixtureItem } from "@/types/common";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { SmartFilterChips } from "../components";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { getPositionInGroup } from "../utils/utils";
import { HEADER_HEIGHT } from "../utils/constants";

type Props = {
  groupId: number | null;
  fixtures: FixtureItem[];
  selectionMode?: "games" | "teams" | "leagues";
};

/**
 * Draft screen for group games.
 * Shows fixtures with remove (X) / restore (blue plus).
 * X marks as deselected (dimmed); plus restores.
 */
export function GroupGamesDraftScreen({
  groupId,
  fixtures: fixturesProp,
  selectionMode,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [deselectedIds, setDeselectedIds] = useState<Set<number>>(new Set());

  const hasDeselectedGames = deselectedIds.size > 0;

  const { data: filtersData } = useGroupGamesFiltersQuery(groupId);
  const mode = selectionMode ?? filtersData?.data.mode ?? "games";

  const toggleDeselected = useCallback(
    (fixtureId: number, deselect: boolean) => {
      setDeselectedIds((prev) => {
        const next = new Set(prev);
        if (deselect) next.add(fixtureId);
        else next.delete(fixtureId);
        return next;
      });
    },
    []
  );

  const fixtures = useMemo(
    () => (Array.isArray(fixturesProp) ? fixturesProp : []),
    [fixturesProp]
  );

  const {
    actionChips,
    selectedAction,
    selectAction,
    structuralFilter,
    selectTeam,
    selectRound,
    navigateRound,
    filteredFixtures,
    hasAnyChips,
  } = useSmartFilters({ fixtures, mode });

  const updateGroupMutation = useUpdateGroupMutation(groupId);

  const remainingFixtureIds = useMemo(() => {
    return fixtures
      .map((fixture) => fixture.id)
      .filter((id) => !deselectedIds.has(id));
  }, [fixtures, deselectedIds]);

  const handleUpdateSelections = useCallback(() => {
    if (!groupId) {
      Alert.alert(t("errors.error"), t("predictions.errorGroupIdRequired"));
      return;
    }

    if (remainingFixtureIds.length === 0) {
      Alert.alert(
        t("predictions.cannotUpdate"),
        t("predictions.mustKeepOneGame")
      );
      return;
    }

    updateGroupMutation.mutate(
      { fixtureIds: remainingFixtureIds },
      {
        onSuccess: () => {
          setDeselectedIds(new Set());
        },
        onError: (error) => {
          Alert.alert(
            t("predictions.updateFailed"),
            error?.message || t("predictions.updateFailedMessage")
          );
        },
      }
    );
  }, [groupId, remainingFixtureIds, updateGroupMutation]);

  const leagueDateGroups = useGroupedFixtures({ fixtures: filteredFixtures, mode });

  const totalGames = fixtures.length;
  const selectedCount = remainingFixtureIds.length;
  const removedCount = deselectedIds.size;


  if (filteredFixtures.length === 0) {
    return (
      <Screen>
        <View style={[styles.headerOverlay, { top: 0 }]} pointerEvents="box-none">
          <GroupGamesHeader
            onBack={() => router.back()}
            backOnly
            title={t("predictions.editGames")}

          />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="football-outline"
            size={48}
            color={theme.colors.textSecondary}
            style={{ marginBottom: 12 }}
          />
          <AppText variant="body" color="secondary" style={{ textAlign: "center", marginBottom: 16 }}>
            {t("predictions.noGamesSelected")}
          </AppText>
          <Button
            label={t("pool.back")}
            onPress={() => router.back()}
            style={{ minWidth: 140 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {hasAnyChips && (
        <SmartFilterChips
          actionChips={actionChips}
          selectedAction={selectedAction}
          onSelectAction={selectAction}
          structuralFilter={structuralFilter}
          onSelectTeam={selectTeam}
          onSelectRound={selectRound}
          onNavigateRound={navigateRound}
        />
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: HEADER_HEIGHT + insets.top,
            paddingBottom: hasDeselectedGames ? 120 + insets.bottom : 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary stats */}
        <View
          style={[
            styles.summaryBar,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.statItem}>
            <Ionicons name="football-outline" size={15} color={theme.colors.primary} />
            <AppText style={[styles.statValue, { color: theme.colors.text }]}>
              {totalGames}
            </AppText>
            <AppText style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("lobby.games")}
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.primary} />
            <AppText style={[styles.statValue, { color: theme.colors.text }]}>
              {selectedCount}
              <AppText style={[styles.statValueSub, { color: theme.colors.textSecondary }]}>
                /{totalGames}
              </AppText>
            </AppText>
            <AppText style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("predictions.selectedLabel")}
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons
              name="close-circle-outline"
              size={15}
              color={removedCount > 0 ? "#EF4444" : theme.colors.textSecondary}
            />
            <AppText
              style={[
                styles.statValue,
                { color: removedCount > 0 ? "#EF4444" : theme.colors.text },
              ]}
            >
              {removedCount}
            </AppText>
            <AppText style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t("predictions.removedLabel")}
            </AppText>
          </View>
        </View>

        {leagueDateGroups.map((group) => {
          // Date header (no fixtures — just a date separator)
          if (group.level === "date" && group.fixtures.length === 0) {
            return (
              <View key={group.key} style={styles.dateSeparator}>
                <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
                <AppText style={[styles.dateLabel, { color: theme.colors.primary }]} numberOfLines={1}>
                  {(group.dateLabel || group.label).toUpperCase()}
                </AppText>
                <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
              </View>
            );
          }

          return (
            <View key={group.key}>
              {group.fixtures.map((fixture, index) => (
                <MatchDraftCard
                  key={fixture.id}
                  fixture={fixture as FixtureItem}
                  positionInGroup={getPositionInGroup(index, group.fixtures.length)}
                  isDeselected={deselectedIds.has(fixture.id)}
                  onRemove={() => toggleDeselected(fixture.id, true)}
                  onRestore={() => toggleDeselected(fixture.id, false)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Header overlay */}
      <View style={[styles.headerOverlay, { top: 0 }]} pointerEvents="box-none">
        <GroupGamesHeader
          onBack={() => router.back()}
          backOnly
          title={t("predictions.editGames")}
        />
      </View>

      {/* Floating Update Button */}
      {hasDeselectedGames && (
        <View style={styles.floatingButtonContainer} pointerEvents="box-none">
          <LinearGradient
            colors={["transparent", theme.colors.background]}
            style={styles.floatingGradient}
            pointerEvents="none"
          />
          <View
            style={[
              styles.floatingButtonInner,
              {
                paddingBottom: Math.max(insets.bottom + 8, 24),
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <Button
              label={
                updateGroupMutation.isPending
                  ? t("predictions.updating")
                  : `${t("predictions.updateSelections")} (${t("predictions.removedCount", { count: removedCount })})`
              }
              onPress={handleUpdateSelections}
              style={styles.floatingButton}
              disabled={updateGroupMutation.isPending}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 12 },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statValueSub: {
    fontSize: 13,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  dateLine: {
    flex: 1,
    height: 1.5,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    flexShrink: 0,
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
    zIndex: 1000,
  },
  floatingGradient: {
    height: 40,
  },
  floatingButtonInner: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  floatingButton: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
