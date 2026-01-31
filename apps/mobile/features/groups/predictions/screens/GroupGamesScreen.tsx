import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { ScoreInputNavigationBar, RoundFilterTabs,
  TeamsModeFilterTabs,
  GamesModeFilterTabs, } from "../components";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { MatchPredictionCardVertical } from "../components/MatchPredictionCardVertical";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupGamePredictions } from "../hooks/useGroupGamePredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useGroupGamesFilters } from "../hooks/useGroupGamesFilters";
import { useFilteredFixtures } from "../hooks/useFilteredFixtures";
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import type { FixtureItem } from "@/types/common";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { SingleGameView } from "../components/SingleGameView";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { HEADER_HEIGHT, FOOTER_PADDING } from "../utils/constants";
import { calculateContentPaddingTopDefault, getPositionInGroup } from "../utils/utils";
 
import { useGroupGamesFiltersQuery } from "@/domains/groups";

type Props = {
  groupId: number | null;
  fixtures: FixtureItem[]; // Fixtures passed from parent (already fetched with group)
  predictionMode?: string;
};

/**
 * Feature screen for group games score predictions.
 * This file intentionally keeps only high-level orchestration:
 * - data query
 * - state for predictions
 * - wiring of keyboard/nav/scroll behaviors
 */
export function GroupGamesScreen({ groupId, fixtures: fixturesProp, predictionMode }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = React.useState<"list" | "single">("list");
  const [selectedRound, setSelectedRound] = React.useState<string | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = React.useState<number | null>(null);

  // Fetch games filters to check if mode is "leagues", "teams", or "games"
  const { data: filtersData } = useGroupGamesFiltersQuery(groupId);
  const isLeaguesMode = filtersData?.data.mode === "leagues";
  const isTeamsMode = filtersData?.data.mode === "teams";
  const isGamesMode = filtersData?.data.mode === "games";
  const availableRounds = filtersData?.data.filters && "rounds" in filtersData.data.filters
    ? filtersData.data.filters.rounds
    : [];
  const availableLeagues = filtersData?.data.leagues || [];

  // Use fixtures from props (already fetched with group query)
  const fixtures = useMemo(() => {
    return Array.isArray(fixturesProp) ? fixturesProp : [];
  }, [fixturesProp]);

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

  // Group fixtures by league/date with LIVE fixtures separated
  // Groups by league/date only (time is shown in card)
  const leagueDateGroups = useGroupedFixtures(filteredFixtures);

  const {
    predictions,
    savedPredictions,
    updatePrediction,
    setOutcomePrediction,
    fillRandomPredictions,
    saveAllChangedPredictions,
    isSaving,
  } = useGroupGamePredictions({
    fixtures,
    groupId,
    predictionMode,
  });

  const predictionModeTyped: "CorrectScore" | "MatchWinner" =
    predictionMode === "MatchWinner" ? "MatchWinner" : "CorrectScore";

  const handleSelectOutcome = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fixtureId, outcome);
      setTimeout(() => saveAllChangedPredictions(), 50);
    },
    [setOutcomePrediction, saveAllChangedPredictions]
  );

  // Calculate predictions statistics
  const { latestUpdatedAt, savedPredictionsCount, totalPredictionsCount } =
    usePredictionsStats({
      fixtures,
      predictions,
      savedPredictions,
    });

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

  const { handleFieldFocus, handleFieldBlur } = useCardFocusSaving({
    currentFocusedField,
    setCurrentFocusedField,
  });

  // Listen for keyboard dismissal (when user taps background, not just Done button)
  React.useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // Save all changed predictions when keyboard is dismissed
        // The saveAllChangedPredictions function already checks if there are changes
        // and if a save is in progress, so this is safe to call
        saveAllChangedPredictions();
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [saveAllChangedPredictions]);

  // Ensure refs exist for all fixtures currently rendered
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

  // Calculate if filters should be shown
  const hasFilters = useMemo(() => {
    if (isLeaguesMode && availableRounds.length > 0) return true;
    if ((isTeamsMode || isGamesMode) && (availableLeagues.length > 0 || hasTodayFixtures || hasThisWeekFixtures)) return true;
    return false;
  }, [isLeaguesMode, isTeamsMode, isGamesMode, availableRounds.length, availableLeagues.length, hasTodayFixtures, hasThisWeekFixtures]);

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

  const handleDone = () => {
    // Save all changed predictions before dismissing keyboard
    // The saveAllChangedPredictions function already checks if there are changes
    // and prevents double saves, so this is safe to call
    saveAllChangedPredictions();
    Keyboard.dismiss();
  };

  const handleMatchPredictionCardChange = (fixtureId: number, type: "home" | "away", text: string) => {
    updatePrediction(fixtureId, type, text, (fixtureId, t) => {
      const nextIndex = getNextFieldIndex(fixtureId, t);
      if (nextIndex >= 0) navigateToField(nextIndex);
    });
  };

  const handleAutoNext = (fixtureId: number, type: "home" | "away") => {
    const nextIndex = getNextFieldIndex(fixtureId, type);
    if (nextIndex >= 0) navigateToField(nextIndex);
  };

  const header = (
    <GroupGamesHeader
      viewMode={viewMode}
      onBack={() => router.back()}
      onFillRandom={fillRandomPredictions}
      onToggleView={() =>
        setViewMode(viewMode === "list" ? "single" : "list")
      }
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === "single" ? (
        <View style={{ flex: 1, paddingTop: HEADER_HEIGHT }}>
          <SingleGameView
            fixtures={fixtures}
            predictions={predictions}
            savedPredictions={savedPredictions}
            inputRefs={inputRefs}
            currentFocusedField={currentFocusedField}
            setCurrentFocusedField={setCurrentFocusedField}
            onUpdatePrediction={updatePrediction}
            onFieldFocus={(fixtureId, type) => {
              handleFieldFocus(fixtureId, type);
            }}
            onFieldBlur={handleFieldBlur}
            getNextFieldIndex={getNextFieldIndex}
            navigateToField={navigateToField}
            onSaveAllChanged={saveAllChangedPredictions}
            predictionMode={predictionModeTyped}
            onSelectOutcome={predictionMode === "MatchWinner" ? handleSelectOutcome : undefined}
          />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              {
                paddingTop: calculateContentPaddingTopDefault(hasFilters),
                paddingBottom: FOOTER_PADDING + keyboardHeight,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                kickoffIso={null}
              >
                <View style={styles.groupCardContainer}>
                  {/* Render each fixture in the group */}
                  {group.fixtures.map((fixture, index) => {
                    const cardRef = matchCardRefs.current[String(fixture.id)];
                    const prediction = predictions[String(fixture.id)] || {
                      home: null,
                      away: null,
                    };

                    const positionInGroup = getPositionInGroup(
                      index,
                      group.fixtures.length
                    );

                    const commonProps = {
                      positionInGroup,
                      fixture,
                      prediction,
                      inputRefs,
                      currentFocusedField,
                      savedPredictions,
                      cardRef,
                      onFocus: (type: "home" | "away") => {
                        handleFieldFocus(fixture.id, type);
                        scrollToMatchCard(fixture.id);
                      },
                      onBlur: () => {
                        handleFieldBlur(fixture.id);
                      },
                      onChange: (type: "home" | "away", text: string) =>
                        handleMatchPredictionCardChange(fixture.id, type, text),
                      onAutoNext: (type: "home" | "away") => {
                        handleAutoNext(fixture.id, type);
                      },
                      predictionMode: predictionModeTyped,
                      onSelectOutcome:
                        predictionMode === "MatchWinner"
                          ? (outcome: "home" | "draw" | "away") =>
                              handleSelectOutcome(fixture.id, outcome)
                          : undefined,
                    };

                    return (
                      <MatchPredictionCardVertical key={fixture.id} {...commonProps} />
                    );
                  })}
                </View>
              </LeagueDateGroupSection>
            ))}

            <GroupGamesLastSavedFooter
              latestUpdatedAt={latestUpdatedAt}
              isSaving={isSaving}
              savedCount={savedPredictionsCount}
              totalCount={totalPredictionsCount}
            />
          </ScrollView>

          <ScoreInputNavigationBar
            onPrevious={handlePrevious}
            onNext={handleNext}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            keyboardHeight={keyboardHeight}
            onDone={handleDone}
          />
        </>
      )}
      <View style={[styles.headerOverlay, { top: 0 }]} pointerEvents="box-none">
        {header}
      </View>
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
});
