import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  ScrollView,
  Keyboard,
  Alert,
  InteractionManager,
} from "react-native";
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
import { useGroupGamePredictions } from "../hooks/useGroupGamePredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { SingleGameView } from "../components/SingleGameView";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { FOOTER_PADDING } from "../utils/constants";
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
 * - Renders either list view (ScrollView + GroupFixtureCard per fixture) or
 *   single-game view (SingleGameView). Handlers are memoized so fixture cards
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
  /** Toggle between full list of fixtures and single-fixture swipe view. */
  const [viewMode, setViewMode] = React.useState<"list" | "single">("list");
  /** When opening single view from a card press, scroll to this index; 0 when opening via toggle. */
  const [singleViewInitialIndex, setSingleViewInitialIndex] = React.useState(0);
  /** Pre-mount SingleGameView after interactions so first tap is instant. */
  const [singleViewReady, setSingleViewReady] = React.useState(false);

  React.useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setSingleViewReady(true);
    });
    return () => handle.cancel();
  }, []);

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

  /** Local prediction state, save-to-server, and MatchWinner 1/X/2 handling. */
  const {
    predictions,
    savedPredictions,
    updatePrediction,
    setOutcomePrediction,
    getFillRandomConfirm,
    fillRandomPredictions,
    saveAllChangedPredictions,
    isSaving,
  } = useGroupGamePredictions({
    fixtures,
    groupId,
    predictionMode,
  });

  /** Show confirmation if needed, then fill random. Caller shows alerts using t(). */
  const handleFillRandom = useCallback(() => {
    const confirmInfo = getFillRandomConfirm();
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
            onPress: () => fillRandomPredictions(true),
          },
        ]
      );
    } else {
      fillRandomPredictions(true);
    }
  }, [getFillRandomConfirm, fillRandomPredictions, t]);

  /** Save all changed predictions and show alerts on rejected/error using t(). */
  const handleSaveAllChanged = useCallback(() => {
    saveAllChangedPredictions()
      .then((result) => {
        if (result.rejected != null && result.rejected > 0) {
          Alert.alert(
            t("predictions.somePredictionsSkipped"),
            t("predictions.somePredictionsSkippedMessage", {
              count: result.rejected,
            })
          );
        }
      })
      .catch(() => {
        Alert.alert(
          t("predictions.saveFailed"),
          t("predictions.saveFailedMessage")
        );
      });
  }, [saveAllChangedPredictions, t]);

  const predictionModeTyped = predictionMode ?? "CorrectScore";

  /** For MatchWinner mode: set 1/X/2 and trigger a save shortly after. */
  const handleSelectOutcome = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fixtureId, outcome);
      setTimeout(() => handleSaveAllChanged(), 50);
    },
    [setOutcomePrediction, handleSaveAllChanged]
  );

  /** Stats for footer: last saved time, saved count, total count. */
  const { latestUpdatedAt, savedPredictionsCount, totalPredictionsCount } =
    usePredictionsStats({
      fixtures,
      predictions,
      savedPredictions,
    });

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

  /** Open single view scrolled to the pressed fixture (index in filtered list). */
  const handlePressCard = useCallback(
    (fixtureId: number) => {
      const index = filteredFixtures.findIndex((f) => f.id === fixtureId);
      if (index >= 0) {
        setSingleViewInitialIndex(index);
        setViewMode("single");
      }
    },
    [filteredFixtures]
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

  const header = (
    <GroupGamesHeader
      viewMode={viewMode}
      onBack={() => router.back()}
      onFillRandom={handleFillRandom}
      onToggleView={() => {
        if (viewMode === "list") {
          setSingleViewInitialIndex(0);
          setViewMode("single");
        } else {
          setViewMode("list");
        }
      }}
    />
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Single game view — pre-mounted after interactions, hidden when list is shown. */}
      <View
        style={{
          display: viewMode === "single" ? "flex" : "none",
          flex: 1,
        }}
      >
        {singleViewReady && (
          <SingleGameView
            isVisible={viewMode === "single"}
            groupId={groupId}
            fixtures={filteredFixtures}
            predictions={predictions}
            savedPredictions={savedPredictions}
            inputRefs={inputRefs}
            currentFocusedField={currentFocusedField}
            setCurrentFocusedField={setCurrentFocusedField}
            onUpdatePrediction={updatePrediction}
            initialIndex={singleViewInitialIndex}
            onBack={() => setViewMode("list")}
            onFieldFocus={(fixtureId, type) => {
              handleFieldFocus(fixtureId, type);
            }}
            onFieldBlur={handleFieldBlur}
            getNextFieldIndex={getNextFieldIndex}
            navigateToField={navigateToField}
            onSaveAllChanged={handleSaveAllChanged}
            predictionMode={predictionModeTyped}
            onSelectOutcome={
              predictionMode === "MatchWinner" ? handleSelectOutcome : undefined
            }
          />
        )}
      </View>

      {/* List view — always mounted. */}
      <View
        style={{
          display: viewMode === "list" ? "flex" : "none",
          flex: 1,
        }}
      >
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
                        prediction={
                          predictions[String(fixture.id)] || {
                            home: null,
                            away: null,
                          }
                        }
                        inputRefs={inputRefs}
                        currentFocusedField={currentFocusedField}
                        savedPredictions={savedPredictions}
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
        />

        {/* Header floats above list content. */}
        <View
          style={[styles.headerOverlay, { top: 0 }]}
          pointerEvents="box-none"
        >
          {header}
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
