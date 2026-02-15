import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, Keyboard, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  ScoreInputNavigationBar,
  SmartFilterChips,
  GroupFixtureCard,
  FixtureGroupSection,
  VerticalTimelineWrapper,
} from "../components";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";
import { isFinished as isFinishedState, isCancelled as isCancelledState } from "@repo/utils";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { HEADER_HEIGHT, FOOTER_PADDING, SAVE_PENDING_DELAY_MS, SCROLL_OFFSET } from "../utils/constants";

type Props = {
  groupId: number | null;
  /** Fixtures passed from parent (already fetched with group). */
  fixtures: FixtureItem[];
  predictionMode?: PredictionMode;
  groupName?: string;
  selectionMode?: "games" | "teams" | "leagues";
  groupTeamsIds?: number[];
  /** Index to scroll to on mount */
  scrollToIndex?: number;
};

/**
 * Feature screen for group games score predictions.
 *
 * This file keeps only high-level orchestration:
 * - Normalises fixtures from props and applies filters (teams/rounds/actions).
 * - Groups fixtures by league/date and manages prediction state (local + save).
 * - Wires keyboard height, focus saving, and prev/next field navigation.
 * - Renders list view (ScrollView + GroupFixtureCard per fixture); card press
 *   navigates to dedicated single-game route. Handlers are memoized so fixture cards
 *   re-render only when their props change.
 */
export function GroupGamesScreen({
  groupId,
  fixtures: fixturesProp,
  predictionMode,
  groupName,
  selectionMode,
  groupTeamsIds,
  scrollToIndex,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const mode = selectionMode ?? "games";

  // State for highlighted fixture (temporary highlight when scrolling to it)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);

  /** Normalise fixtures from props; ensure we always have an array. */
  const fixtures = useMemo(() => {
    return Array.isArray(fixturesProp) ? fixturesProp : [];
  }, [fixturesProp]);

  const navigateToLeaderboard = React.useCallback(() => {
    if (groupId != null) {
      router.push(`/groups/${groupId}/ranking`);
    }
  }, [groupId, router]);

  /** Filter chips (teams, rounds, actions) and empty-state messaging. */
  const {
    actionChips,
    selectedAction,
    selectAction,
    structuralFilter,
    selectTeam,
    selectCompetition,
    selectRound,
    navigateRound,
    filteredFixtures,
    hasAnyChips,
    emptyState,
  } = useSmartFilters({
    fixtures,
    mode,
    groupTeamsIds,
    onNavigateToLeaderboard: navigateToLeaderboard,
  });

  /** Fixtures grouped based on selection mode; LIVE fixtures are separated. */
  /** In leagues mode with round filter active, skip grouping (flat list) */
  const skipGrouping = mode === "leagues" && selectedAction === "round";
  const fixtureGroups = useGroupedFixtures({
    fixtures: filteredFixtures,
    mode,
    skipGrouping,
    groupTeamsIds,
  });

  /** Shared prediction state (React Query cache), save-to-server, and MatchWinner 1/X/2. */
  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    getFillRandomConfirm,
    fillRandomPredictions,
    saveAllPending,
    isSaving,
  } = useGroupPredictions({
    groupId,
    predictionMode,
  });

  /** Show confirmation if needed, then fill random. Caller shows alerts using t(). */
  const handleFillRandom = useCallback(() => {
    const confirmInfo = getFillRandomConfirm();
    const fixtureIds = filteredFixtures.map((f) => f.id);
    if (confirmInfo !== null) {
      Alert.alert(
        t("predictions.fillRandom"),
        t("predictions.fillRandomOverwrite", {
          count: confirmInfo.existingCount,
        }),
        [
          { text: t("groups.cancel"), style: "cancel" },
          {
            text: t("predictions.fill"),
            onPress: () => fillRandomPredictions(fixtureIds, true),
          },
        ]
      );
    } else {
      fillRandomPredictions(fixtureIds, true);
    }
  }, [getFillRandomConfirm, fillRandomPredictions, filteredFixtures, t]);

  /** Save all pending predictions; show alert on error. */
  const handleSaveAllChanged = useCallback(() => {
    saveAllPending().catch(() => {
      Alert.alert(
        t("predictions.saveFailed"),
        t("predictions.saveFailedMessage")
      );
    });
  }, [saveAllPending, t]);

  const predictionModeTyped = predictionMode ?? "CorrectScore";

  /** For MatchWinner mode: set 1/X/2 and trigger a save shortly after. */
  const handleSelectOutcome = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fixtureId, outcome);
      setTimeout(() => handleSaveAllChanged(), SAVE_PENDING_DELAY_MS);
    },
    [setOutcomePrediction, handleSaveAllChanged]
  );

  /** Stats for footer: last saved time, saved count, total count. */
  const { latestUpdatedAt, savedPredictionsCount, totalPredictionsCount } =
    usePredictionsStats({ fixtures: filteredFixtures });

  /** Refs for inputs/cards, scroll ref, focus state, prev/next and scroll-to-card. */
  const {
    inputRefs,
    matchCardRefs,
    scrollViewRef,
    currentFocusedField,
    setCurrentFocusedField,
    handlePrevious,
    handleNext,
    canGoPrevious,
    canGoNext,
    getNextFieldIndex,
    navigateToField,
    scrollToMatchCard,
  } = usePredictionNavigation(fixtureGroups);

  const keyboardHeight = useKeyboardHeight();

  /** Persist focus in state so nav bar and scroll-to-card know current field. */
  const { handleFieldFocus, handleFieldBlur } = useCardFocusSaving({
    currentFocusedField,
    setCurrentFocusedField,
  });

  /** Save pending predictions when keyboard hides (tap outside or system dismiss). */
  React.useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => handleSaveAllChanged()
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [handleSaveAllChanged]);

  /** Create input/card refs for each fixture so cards can focus and scroll. */
  React.useEffect(() => {
    fixtures.forEach((fixture) => {
      const fixtureIdStr = String(fixture.id);
      if (!inputRefs.current[fixtureIdStr]) {
        inputRefs.current[fixtureIdStr] = {
          home: React.createRef(),
          away: React.createRef(),
        };
      }
      if (!matchCardRefs.current[fixtureIdStr]) {
        matchCardRefs.current[fixtureIdStr] = React.createRef();
      }
    });
  }, [fixtures, inputRefs, matchCardRefs]);

  /** Scroll to specific index and highlight it temporarily. */
  React.useEffect(() => {
    if (scrollToIndex == null || scrollToIndex < 0) return;

    const CARD_HEIGHT = 120; // Approximate card height
    const scrollY = Math.max(0, scrollToIndex * CARD_HEIGHT - SCROLL_OFFSET);

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      setHighlightedIndex(scrollToIndex);
      setTimeout(() => setHighlightedIndex(null), 3000);
    }, 300);

    return () => clearTimeout(timer);
  }, [scrollToIndex]);

  /** Save all changed predictions then dismiss keyboard (Done button). */
  const handleDone = useCallback(() => {
    handleSaveAllChanged();
    Keyboard.dismiss();
  }, [handleSaveAllChanged]);

  /** Save pending then navigate to dedicated single game screen. */
  const handlePressCard = useCallback(
    (fixtureId: number) => {
      if (groupId != null) {
        saveAllPending();
        router.push(`/groups/${groupId}/fixtures/${fixtureId}`);
      }
    },
    [groupId, router, saveAllPending]
  );

  /** Update prediction for a field and optionally move focus to next field. */
  const handleCardChange = useCallback(
    (fixtureId: number, type: "home" | "away", text: string) => {
      updatePrediction(fixtureId, type, text, (fId, t) => {
        const nextIndex = getNextFieldIndex(fId, t);
        if (nextIndex >= 0) navigateToField(nextIndex);
      });
    },
    [updatePrediction, getNextFieldIndex, navigateToField]
  );

  /** Move focus to the next input (e.g. after max digits in score field). */
  const handleAutoNext = useCallback(
    (fixtureId: number, type: "home" | "away") => {
      const nextIndex = getNextFieldIndex(fixtureId, type);
      if (nextIndex >= 0) navigateToField(nextIndex);
    },
    [getNextFieldIndex, navigateToField]
  );

  /** No fixtures at all (e.g. group has no games selected). */
  if (fixtures.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <AppText variant="body" color="secondary">
            {t("predictions.noGamesSelected")}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: HEADER_HEIGHT,
              paddingBottom: FOOTER_PADDING + keyboardHeight,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Filters applied but no fixtures match. */}
          {emptyState && filteredFixtures.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <AppText
                variant="body"
                color="secondary"
                style={styles.emptyStateMessage}
              >
                {emptyState.message}
              </AppText>
              {emptyState.suggestion && (
                <AppText
                  variant="body"
                  style={[
                    styles.emptyStateSuggestion,
                    { color: theme.colors.primary },
                  ]}
                  onPress={emptyState.suggestion.action}
                >
                  {emptyState.suggestion.label}
                </AppText>
              )}
            </View>
          ) : (
            <>
              {/* One section per group (date for leagues mode, league for others). */}
              {(() => {
                const totalFixtures = fixtureGroups.reduce((acc, g) => acc + g.fixtures.length, 0);
                const showEndDot = selectedAction === "all"; // Only in "ALL" tab
                // Flatten all fixtures to check next fixture's state
                const allFixtures = fixtureGroups.flatMap((g) => g.fixtures);
                // Helper to check if a fixture is finished
                const isFixtureFinished = (f: FixtureItem) =>
                  isFinishedState(f.state) || isCancelledState(f.state);
                let globalIndex = 0;
                return (
                  <>
                    {fixtureGroups.map((group) => (
                      <FixtureGroupSection key={group.key} group={group}>
                        <View style={styles.groupCardContainer}>
                          {group.fixtures.map((fixture, index) => {
                            const currentGlobalIndex = globalIndex;
                            globalIndex++;
                            // Check if next fixture is also finished
                            const nextFixture = allFixtures[currentGlobalIndex + 1];
                            const isNextFinished = nextFixture ? isFixtureFinished(nextFixture) : false;
                            return (
                              <VerticalTimelineWrapper
                                key={fixture.id}
                                fixture={fixture}
                                isFirst={currentGlobalIndex === 0}
                                isLast={!showEndDot && currentGlobalIndex === totalFixtures - 1}
                                isNextFinished={isNextFinished}
                                isHighlighted={highlightedIndex === currentGlobalIndex}
                              >
                                <GroupFixtureCard
                                  fixture={fixture}
                                  index={index}
                                  totalInGroup={group.fixtures.length}
                                  prediction={getPrediction(fixture.id)}
                                  inputRefs={inputRefs}
                                  currentFocusedField={currentFocusedField}
                                  isSaved={isPredictionSaved(fixture.id)}
                                  matchCardRefs={matchCardRefs}
                                  predictionMode={predictionModeTyped}
                                  groupName={groupName}
                                  onFieldFocus={handleFieldFocus}
                                  onFieldBlur={handleFieldBlur}
                                  onCardChange={handleCardChange}
                                  onAutoNext={handleAutoNext}
                                  onSelectOutcome={
                                    predictionMode === "MatchWinner"
                                      ? handleSelectOutcome
                                      : undefined
                                  }
                                  onScrollToCard={scrollToMatchCard}
                                  onPressCard={handlePressCard}
                                />
                              </VerticalTimelineWrapper>
                            );
                          })}
                        </View>
                      </FixtureGroupSection>
                    ))}
                    {showEndDot && totalFixtures > 0 && (
                      <>
                        {/* Winner header - same style as date headers */}
                        <View style={styles.winnerHeader}>
                          <AppText
                            style={[
                              styles.winnerHeaderText,
                              { color: theme.colors.warning },
                            ]}
                          >
                            {t("ranking.winner")}
                          </AppText>
                        </View>
                        <View style={styles.timelineEndDot}>
                          <View style={styles.endDotColumn}>
                            {/* Line - absolute positioned to match timeline */}
                            <View
                              style={[
                                styles.endDotLineAbsolute,
                                { backgroundColor: theme.colors.border },
                              ]}
                            />
                            {/* Dot */}
                            <View
                              style={[
                                styles.endDot,
                                {
                                  backgroundColor: theme.colors.background,
                                  borderColor: theme.colors.textSecondary,
                                },
                              ]}
                            >
                              <Ionicons
                                name="trophy-outline"
                                size={14}
                                color={theme.colors.textSecondary}
                              />
                            </View>
                          </View>
                          {/* Winner banner */}
                          <View style={styles.winnerBannerContainer}>
                            <View
                              style={[
                                styles.winnerBanner,
                                {
                                  backgroundColor: theme.colors.surface,
                                  borderWidth: 1,
                                  borderColor: theme.colors.border,
                                  opacity: 0.6,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </>
                    )}
                  </>
                );
              })()}

            </>
          )}
        </ScrollView>

        <ScoreInputNavigationBar
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          keyboardHeight={keyboardHeight}
          onDone={handleDone}
          isSaving={isSaving}
        />

        {/* Header floats above list content. */}
        <View
          style={[styles.headerOverlay, { top: 0 }]}
          pointerEvents="box-none"
        >
          <GroupGamesHeader onBack={() => router.back()}>
            {hasAnyChips && (
              <SmartFilterChips
                actionChips={actionChips}
                selectedAction={selectedAction}
                onSelectAction={selectAction}
                structuralFilter={structuralFilter}
                onSelectTeam={selectTeam}
                onSelectCompetition={selectCompetition}
                onSelectRound={selectRound}
                onNavigateRound={navigateRound}
              />
            )}
          </GroupGamesHeader>
        </View>
      </View>
    </View>
  );
}

/** Layout: full-screen container, scroll content with padding, floating header overlay. */
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 0, paddingVertical: 16 },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  groupCardContainer: {
    marginBottom: 0,
    paddingLeft: 12,
    paddingRight: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStateMessage: {
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSuggestion: {
    fontWeight: "600",
  },
  winnerHeader: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
  },
  winnerHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  timelineEndDot: {
    flexDirection: "row",
    paddingLeft: 12, // Match groupCardContainer paddingLeft
    paddingRight: 16, // Match groupCardContainer paddingRight
    marginTop: -40, // Overlap with previous card's line extension
  },
  endDotColumn: {
    width: 56, // Match TIMELINE_WIDTH
    alignItems: "flex-end",
    paddingLeft: 2,
    paddingRight: 6, // Match timeline paddingRight
    paddingTop: 60, // Space for line after header
  },
  endDotLineAbsolute: {
    position: "absolute",
    width: 2,
    top: -40, // Start from overlap point
    height: 112, // To reach dot center
    right: 6 + 8 - 1, // Match timeline: 13px from right
  },
  endDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -4, // Shift dot so its center aligns with the timeline line
  },
  winnerBannerContainer: {
    flex: 1,
    paddingTop: 52, // Center banner on dot
  },
  winnerBanner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
    marginRight: 24, // Account for chevron space in cards
  },
  winnerBannerText: {
    fontSize: 16,
    fontWeight: "300",
  },
});
