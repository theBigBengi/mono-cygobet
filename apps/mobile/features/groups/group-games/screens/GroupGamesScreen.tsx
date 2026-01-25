import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, Keyboard } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { ScoreInputNavigationBar } from "@/features/groups/games-selection/components/ScoreInputNavigationBar";
import { groupFixturesByLeagueAndDate } from "@/utils/fixture";
import { LeagueDateGroupSection } from "@/components/Fixtures/LeagueDateGroupSection";
import { MatchPredictionCard } from "../components/MatchPredictionCard";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupGamePredictions } from "../hooks/useGroupGamePredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import type { FixtureItem } from "../types";
import { GroupGamesLastSavedFooter } from "../components/GroupGamesLastSavedFooter";
import { SingleGameView } from "../components/SingleGameView";
import { GroupGamesHeader } from "../components/GroupGamesHeader";

type Props = {
  groupId: number | null;
  fixtures: FixtureItem[]; // Fixtures passed from parent (already fetched with group)
};

/**
 * Feature screen for group games score predictions.
 * This file intentionally keeps only high-level orchestration:
 * - data query
 * - state for predictions
 * - wiring of keyboard/nav/scroll behaviors
 */
export function GroupGamesScreen({ groupId, fixtures: fixturesProp }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = React.useState<"list" | "single">("list");

  // Use fixtures from props (already fetched with group query)
  const fixtures = useMemo(() => {
    return Array.isArray(fixturesProp) ? fixturesProp : [];
  }, [fixturesProp]);
  
  const leagueDateGroups = useMemo(
    () => groupFixturesByLeagueAndDate(fixtures),
    [fixtures]
  );

  const {
    predictions,
    savedPredictions,
    updatePrediction,
    fillRandomPredictions,
    saveAllChangedPredictions,
    isSaving,
  } = useGroupGamePredictions({
    groupId,
    fixtures: fixtures as FixtureItem[],
  });

  // Calculate the latest updatedAt from all predictions
  const latestUpdatedAt = useMemo<Date | null>(() => {
    if ( fixtures.length === 0) return null;

    let latest: Date | null = null;
    fixtures.forEach((fixture) => {
      if (fixture.prediction?.updatedAt) {
        const updatedDate = new Date(fixture.prediction.updatedAt);
        if (!latest || updatedDate > latest) {
          latest = updatedDate;
        }
      }
    });

    return latest;
  }, [fixtures]);

  // Calculate saved predictions count (predictions with both home and away filled and saved)
  const savedPredictionsCount = useMemo(() => {
    return fixtures.filter((fixture) => {
      const fixtureIdStr = String(fixture.id);
      const prediction = predictions[fixtureIdStr];
      return (
        prediction &&
        prediction.home !== null &&
        prediction.away !== null &&
        savedPredictions.has(fixture.id)
      );
    }).length;
  }, [fixtures, predictions, savedPredictions]);

  const totalPredictionsCount = fixtures.length;

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

  if (fixtures.length === 0) {
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

  const handleDone = () => {
    // Save all changed predictions before dismissing keyboard
    // The saveAllChangedPredictions function already checks if there are changes
    // and prevents double saves, so this is safe to call
    saveAllChangedPredictions();
    Keyboard.dismiss();
  };

  const HEADER_HEIGHT = 64;

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
                paddingTop: HEADER_HEIGHT,
                paddingBottom: 100 + keyboardHeight,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {leagueDateGroups.map((group) => (
              <LeagueDateGroupSection
                key={group.key}
                leagueName={group.leagueName}
                dateKey={group.dateKey}
                kickoffIso={group.kickoffIso}
              >
                <View style={styles.groupCardContainer}>
                  {group.fixtures.map((fixture, index) => {
                    const fixtureIdStr = String(fixture.id);
                    const prediction = predictions[fixtureIdStr] || {
                      home: null,
                      away: null,
                    };

                    const isHomeFocused =
                      currentFocusedField?.fixtureId === fixture.id &&
                      currentFocusedField.type === "home";
                    const isAwayFocused =
                      currentFocusedField?.fixtureId === fixture.id &&
                      currentFocusedField.type === "away";

                    const homeRef = inputRefs.current[fixtureIdStr]?.home;
                    const awayRef = inputRefs.current[fixtureIdStr]?.away;
                    const cardRef = matchCardRefs.current[fixtureIdStr];

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

                    const isSaved = savedPredictions.has(fixture.id);

                    return (
                      <View key={fixture.id} ref={cardRef}>
                        <MatchPredictionCard
                          fixture={fixture as FixtureItem}
                          prediction={prediction}
                          homeRef={homeRef}
                          awayRef={awayRef}
                          homeFocused={isHomeFocused}
                          awayFocused={isAwayFocused}
                          positionInGroup={positionInGroup}
                          isSaved={isSaved}
                          onFocus={(type) => {
                            handleFieldFocus(fixture.id, type);
                            scrollToMatchCard(fixture.id);
                          }}
                          onBlur={() => {
                            handleFieldBlur(fixture.id);
                          }}
                          onChange={(type, text) =>
                            updatePrediction(
                              fixture.id,
                              type,
                              text,
                              (fixtureId, t) => {
                                const nextIndex = getNextFieldIndex(fixtureId, t);
                                if (nextIndex >= 0) navigateToField(nextIndex);
                              }
                            )
                          }
                          onAutoNext={(type) => {
                            const nextIndex = getNextFieldIndex(fixture.id, type);
                            if (nextIndex >= 0) {
                              navigateToField(nextIndex);
                            }
                          }}
                        />
                      </View>
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
  lastSavedContainer: {
    // paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "flex-start",
  },
  lastSavedLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastSavedText: {
    fontSize: 11,
  },
});
