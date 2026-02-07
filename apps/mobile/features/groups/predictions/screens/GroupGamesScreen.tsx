import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, Keyboard, Alert } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  ScoreInputNavigationBar,
  SmartFilterChips,
  GroupFixtureCard,
} from "../components";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { FOOTER_PADDING, SAVE_PENDING_DELAY_MS } from "../utils/constants";
import { calculateContentPaddingTopDefault } from "../utils/utils";

type Props = {
  groupId: number | null;
  /** Fixtures passed from parent (already fetched with group). */
  fixtures: FixtureItem[];
  predictionMode?: PredictionMode;
  groupName?: string;
  selectionMode?: "games" | "teams" | "leagues";
  groupTeamsIds?: number[];
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
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const mode = selectionMode ?? "games";

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

  /** Fixtures grouped by league + date; LIVE fixtures are separated for layout. */
  const leagueDateGroups = useGroupedFixtures(filteredFixtures);

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
  } = usePredictionNavigation(leagueDateGroups);

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
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: calculateContentPaddingTopDefault(hasAnyChips),
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
              {/* One section per league/date; each section has a list of fixture cards. */}
              {leagueDateGroups.map((group) => (
                <LeagueDateGroupSection
                  key={group.key}
                  leagueName={group.leagueName}
                  dateKey={group.dateKey}
                  kickoffIso={null}
                >
                  <View style={styles.groupCardContainer}>
                    {/* Per-fixture card: position, share, and bound callbacks live in GroupFixtureCard. */}
                    {group.fixtures.map((fixture, index) => (
                      <GroupFixtureCard
                        key={fixture.id}
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
                    ))}
                  </View>
                </LeagueDateGroupSection>
              ))}

              <GroupGamesLastSavedFooter
                latestUpdatedAt={latestUpdatedAt}
                isSaving={isSaving}
                savedCount={savedPredictionsCount}
                totalCount={totalPredictionsCount}
              />
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
          <GroupGamesHeader
            onBack={() => router.back()}
            onFillRandom={handleFillRandom}
          />
        </View>
      </View>
    </View>
  );
}

/** Layout: full-screen container, scroll content with padding, floating header overlay. */
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
});
