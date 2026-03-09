import React, { useMemo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Keyboard, Alert, Text, Pressable, InteractionManager, type ListRenderItemInfo } from "react-native";
import Animated, { withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  ScoreInputNavigationBar,
  SmartFilterChips,
  GroupFixtureCard,
} from "../components";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { usePredictionNavigation } from "../hooks/usePredictionNavigation";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useCardFocusSaving } from "../hooks/useCardFocusSaving";
import { useSmartFilters } from "../hooks/useSmartFilters";
import { useGroupedFixtures, type LeaguesGroupBy } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import { useCollapsingHeader } from "../hooks/useCollapsingHeader";
import { useScrollToNextButton } from "../hooks/useScrollToNextButton";
import { useGameViewPrefs } from "../hooks/useGameViewPrefs";
import type { PredictionMode, FixtureItem, RenderItem } from "../types";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { GroupGamesListHeader } from "../components/GroupGamesListHeader";
import { ScrollToNextButton } from "../components/ScrollToNextButton";
import { buildRenderItems } from "../utils/buildRenderItems";
import { isFinished as isFinishedState, isLive as isLiveState, isCancelled as isCancelledState } from "@repo/utils";
import { HEADER_HEIGHT, FOOTER_PADDING, SAVE_PENDING_DELAY_MS, SCROLL_OFFSET } from "../utils/constants";

type Props = {
  groupId: number | null;
  fixtures: FixtureItem[];
  predictionMode?: PredictionMode;
  groupName?: string;
  selectionMode?: "games" | "teams" | "leagues";
  groupTeamsIds?: number[];
  scrollToIndex?: number;
  scrollToFixtureId?: number;
  maxPossiblePoints?: number;
};

export function GroupGamesScreen({
  groupId,
  fixtures: fixturesProp,
  predictionMode,
  groupName,
  selectionMode,
  groupTeamsIds,
  scrollToIndex,
  scrollToFixtureId,
  maxPossiblePoints,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const mode = selectionMode ?? "games";

  const { cardLayout, useFullName, toggleCardLayout: rawToggleLayout, toggleFullName: rawToggleFullName } = useGameViewPrefs();
  const [leaguesGroupBy, setLeaguesGroupBy] = useState<LeaguesGroupBy>("round");
  const toggleCardLayout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rawToggleLayout();
  }, [rawToggleLayout]);

  const [isReady, setIsReady] = React.useState(false);
  React.useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    });
    return () => handle.cancel();
  }, []);

  const fixtures = useMemo(() => {
    return Array.isArray(fixturesProp) ? fixturesProp : [];
  }, [fixturesProp]);

  const navigateToLeaderboard = React.useCallback(() => {
    if (groupId != null) {
      router.push(`/groups/${groupId}/ranking`);
    }
  }, [groupId, router]);

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

  const skipGrouping = mode === "leagues" && selectedAction === "round";
  const fixtureGroups = useGroupedFixtures({
    fixtures: filteredFixtures,
    mode,
    skipGrouping,
    groupTeamsIds,
    leaguesGroupBy,
  });

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
    pending,
  } = useGroupPredictions({
    groupId,
    predictionMode,
  });

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

  const handleSaveAllChanged = useCallback(() => {
    saveAllPending().catch(() => {
      Alert.alert(
        t("predictions.saveFailed"),
        t("predictions.saveFailedMessage")
      );
    });
  }, [saveAllPending, t]);

  const predictionModeTyped = predictionMode ?? "CorrectScore";

  const matchNumbersMap = useMemo(() => {
    const map: Record<number, string> = {};
    let globalIndex = 1;
    let totalCount = 0;
    fixtureGroups.forEach((group) => {
      totalCount += group.fixtures.length;
    });
    fixtureGroups.forEach((group) => {
      group.fixtures.forEach((fixture) => {
        map[fixture.id] = `${globalIndex++}/${totalCount}`;
      });
    });
    return map;
  }, [fixtureGroups]);

  const maxPoints = maxPossiblePoints ?? 0;

  const renderItems = useMemo(
    () => buildRenderItems(fixtureGroups),
    [fixtureGroups]
  );

  const summaryStats = useMemo(() => {
    let totalPoints = 0;
    let settledWithPoints = 0;
    let maxPointsCount = 0;
    let totalSettled = 0;

    filteredFixtures.forEach((f) => {
      if (f.prediction?.points != null && f.prediction.points > 0) {
        totalPoints += f.prediction.points;
        settledWithPoints++;
      }
      if (f.prediction?.settled) {
        totalSettled++;
        if (f.prediction?.points != null && f.prediction.points >= 3) {
          maxPointsCount++;
        }
      }
    });

    const accuracy =
      totalSettled > 0
        ? Math.round((settledWithPoints / totalSettled) * 100)
        : 0;
    const maxAccuracy =
      totalSettled > 0
        ? Math.round((maxPointsCount / totalSettled) * 100)
        : 0;
    return { totalPoints, accuracy, maxAccuracy, totalSettled };
  }, [filteredFixtures]);

  const nextToPredictId = useMemo(() => {
    const allFixtures: FixtureItem[] = [];
    fixtureGroups.forEach((g) =>
      g.fixtures.forEach((f) => allFixtures.push(f))
    );
    for (const f of allFixtures) {
      const state = f.state;
      if (state && (isFinishedState(state) || isLiveState(state) || isCancelledState(state))) continue;
      return f.id;
    }
    return null;
  }, [fixtureGroups]);

  const handleSelectOutcome = React.useCallback(
    (fixtureId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fixtureId, outcome);
      setTimeout(() => handleSaveAllChanged(), SAVE_PENDING_DELAY_MS);
    },
    [setOutcomePrediction, handleSaveAllChanged]
  );

  const { latestUpdatedAt, savedPredictionsCount, totalPredictionsCount } =
    usePredictionsStats({ fixtures: filteredFixtures });

  const {
    inputRefs,
    matchCardRefs,
    flatListRef,
    updateFixtureIndexMap,
    currentFocusedField,
    setCurrentFocusedField,
    isNavigatingRef,
    isNavigatingSV,
    handlePrevious,
    handleNext,
    canGoPrevious,
    canGoNext,
    getNextFieldIndex,
    navigateToField,
    scrollToMatchCard,
  } = usePredictionNavigation(fixtureGroups);

  const fixtureIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    renderItems.forEach((item, i) => {
      if (item.type === "card") {
        map.set(item.fixture.id, i);
      }
    });
    return map;
  }, [renderItems]);

  React.useEffect(() => {
    updateFixtureIndexMap(fixtureIndexMap);
  }, [fixtureIndexMap, updateFixtureIndexMap]);

  // Render enough items so scrollToIndex never fails for the target fixture
  const initialNumToRender = useMemo(() => {
    if (scrollToFixtureId == null) return 10;
    const targetIndex = fixtureIndexMap.get(scrollToFixtureId);
    if (targetIndex == null) return 10;
    // Render up to the target + a buffer so it's in the render window
    return targetIndex + 5;
  }, [scrollToFixtureId, fixtureIndexMap]);

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    // Action chip label (All, Live, Predict, Today, Results, etc.)
    const activeChip = actionChips.find((c) => c.id === selectedAction);
    if (activeChip) parts.push(activeChip.label);
    // Structural filters (team, competition, round)
    if (structuralFilter?.type === "teams") {
      const selectedTeam = structuralFilter.teams.find((t) => t.id === structuralFilter.selectedTeamId);
      if (selectedTeam) parts.push(selectedTeam.name);
      const selectedComp = structuralFilter.competitions.find((c) => c.id === structuralFilter.selectedCompetitionId);
      if (selectedComp) parts.push(selectedComp.name);
    }
    if (structuralFilter?.type === "rounds" && selectedAction === "round") {
      parts.push(`Round ${structuralFilter.selectedRound}`);
    }
    return parts.join(" \u00B7 ");
  }, [actionChips, selectedAction, structuralFilter]);

  const filterSheetRef = useRef<BottomSheetModal>(null);

  const handleFilterPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    filterSheetRef.current?.present();
  }, []);

  const handleFilterDone = useCallback(() => {
    filterSheetRef.current?.dismiss();
  }, []);

  const renderFilterBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const totalHeaderH = HEADER_HEIGHT + insets.top;

  const {
    scrollY,
    headerOffset,
    animatedScrollHandler,
    headerAnimatedStyle,
    scrollBtnAnimatedStyle,
  } = useCollapsingHeader({
    totalHeaderHeight: totalHeaderH,
    headerHeight: HEADER_HEIGHT,
  });

  const { scrollBtnDir, handleScrollToNext } = useScrollToNextButton({
    nextToPredictId,
    isReady,
    matchCardRefs,
    scrollY,
    headerOffset,
    insetTop: insets.top,
    scrollToMatchCard,
  });

  const keyboardHeight = useKeyboardHeight();

  const { handleFieldFocus, handleFieldBlur } = useCardFocusSaving({
    currentFocusedField,
    setCurrentFocusedField,
    isNavigatingRef,
  });

  const fixturesById = useMemo(() => {
    const map = new Map<number, FixtureItem>();
    fixtures.forEach((f) => map.set(f.id, f));
    return map;
  }, [fixtures]);

  const focusedTeamInfo = useMemo(() => {
    if (!currentFocusedField) return null;
    const fixture = fixturesById.get(currentFocusedField.fixtureId);
    if (!fixture) return null;
    const team = currentFocusedField.type === "home" ? fixture.homeTeam : fixture.awayTeam;
    return {
      name: team?.name ?? "",
      logo: team?.imagePath ?? null,
    };
  }, [currentFocusedField, fixturesById]);

  React.useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => handleSaveAllChanged()
    );
    return () => {
      keyboardDidHideListener.remove();
    };
  }, [handleSaveAllChanged]);

  React.useEffect(() => {
    if (currentFocusedField) {
      headerOffset.value = withTiming(-totalHeaderH, { duration: 200 });
    } else {
      headerOffset.value = withTiming(0, { duration: 200 });
    }
  }, [currentFocusedField, headerOffset, totalHeaderH]);

  const lastKeyboardHeightRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (currentFocusedField && !isNavigatingRef.current) {
      const keyboardJustAppeared = lastKeyboardHeightRef.current === 0 && keyboardHeight > 0;
      if (keyboardJustAppeared) {
        scrollToMatchCard(currentFocusedField.fixtureId);
      }
    }
    lastKeyboardHeightRef.current = currentFocusedField ? keyboardHeight : 0;
  }, [currentFocusedField, keyboardHeight, scrollToMatchCard, isNavigatingRef]);

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

  const initialScrollDone = React.useRef(false);
  const [highlightedFixtureId, setHighlightedFixtureId] = React.useState<number | null>(null);

  const currentFocusedFieldRef = useRef(currentFocusedField);
  currentFocusedFieldRef.current = currentFocusedField;
  const highlightedFixtureIdRef = useRef(highlightedFixtureId);
  highlightedFixtureIdRef.current = highlightedFixtureId;
  const nextToPredictIdRef = useRef(nextToPredictId);
  nextToPredictIdRef.current = nextToPredictId;

  const flatListExtraData = useMemo(
    () => ({ pending, currentFocusedField, highlightedFixtureId, nextToPredictId, cardLayout, useFullName }),
    [pending, currentFocusedField, highlightedFixtureId, nextToPredictId, cardLayout, useFullName]
  );

  React.useEffect(() => {
    if (scrollToFixtureId == null || !isReady) return;
    if (initialScrollDone.current) return;

    initialScrollDone.current = true;

    setTimeout(() => {
      scrollToMatchCard(scrollToFixtureId);
    }, 100);
    setTimeout(() => {
      setHighlightedFixtureId(scrollToFixtureId);
      setTimeout(() => setHighlightedFixtureId(null), 2000);
    }, 600);
  }, [scrollToFixtureId, isReady, scrollToMatchCard]);

  const handleDone = useCallback(() => {
    handleSaveAllChanged();
    Keyboard.dismiss();
  }, [handleSaveAllChanged]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handlePressCard = useCallback(
    (fixtureId: number) => {
      if (groupId != null) {
        router.push(`/groups/${groupId}/fixtures/${fixtureId}`);
        // Defer save to avoid blocking the navigation transition
        InteractionManager.runAfterInteractions(() => {
          saveAllPending();
        });
      }
    },
    [groupId, router, saveAllPending]
  );

  const handleCardChange = useCallback(
    (fixtureId: number, type: "home" | "away", text: string) => {
      updatePrediction(fixtureId, type, text);
    },
    [updatePrediction]
  );

  const handleAutoNext = useCallback(
    (fixtureId: number, type: "home" | "away") => {
      const nextIndex = getNextFieldIndex(fixtureId, type);
      if (nextIndex >= 0) navigateToField(nextIndex);
    },
    [getNextFieldIndex, navigateToField]
  );

  const flatListKeyExtractor = useCallback((item: RenderItem) => {
    return item.type === "header" ? item.key : String(item.fixture.id);
  }, []);

  const flatListRenderItem = useCallback(
    ({ item }: ListRenderItemInfo<RenderItem>) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderContent}>
              {item.isLive ? (
                <View style={[styles.sectionLiveBadge, { backgroundColor: theme.colors.live + "15" }]}>
                  <View style={[styles.sectionLiveDot, { backgroundColor: theme.colors.live }]} />
                  <Text style={[styles.sectionLiveText, { color: theme.colors.live }]}>LIVE</Text>
                </View>
              ) : item.level === "round" && item.label ? (
                <View style={styles.sectionDateRow}>
                  <Text
                    style={[
                      styles.sectionRoundLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      }

      const { fixture, group, indexInGroup } = item;
      return (
        <GroupFixtureCard
          fixture={fixture}
          index={indexInGroup}
          totalInGroup={group.fixtures.length}
          prediction={getPrediction(fixture.id)}
          inputRefs={inputRefs}
          currentFocusedField={currentFocusedFieldRef.current}
          isSaved={isPredictionSaved(fixture.id)}
          isHighlighted={highlightedFixtureIdRef.current === fixture.id}
          matchCardRefs={matchCardRefs}
          predictionMode={predictionModeTyped}
          groupName={groupName}
          matchNumber={matchNumbersMap[fixture.id]}
          timelineFilled={item.timelineFilled}
          timelineConnectorFilled={item.timelineConnectorFilled}
          isFirstInTimeline={item.isFirstInTimeline}
          isLastInTimeline={item.isLastInTimeline}
          isNextToPredict={fixture.id === nextToPredictIdRef.current}
          isMaxPoints={maxPoints > 0 && (fixture.prediction?.points ?? 0) === maxPoints}
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
          hideLeagueName={mode === "leagues"}
          hideRound={mode === "leagues" && leaguesGroupBy === "round"}
          fullRoundLabel={mode === "leagues" && leaguesGroupBy === "date"}
          cardLayout={cardLayout}
          useFullName={useFullName}
        />
      );
    },
    [
      theme, inputRefs, matchCardRefs, predictionModeTyped, groupName,
      matchNumbersMap, maxPoints, handleFieldFocus, handleFieldBlur,
      handleCardChange, handleAutoNext, predictionMode, handleSelectOutcome,
      scrollToMatchCard, handlePressCard, getPrediction, isPredictionSaved,
      cardLayout, useFullName,
    ]
  );

  const listHeaderComponent = useMemo(
    () => (
      <GroupGamesListHeader
        isReady={isReady}
        emptyState={emptyState}
        filteredFixturesCount={filteredFixtures.length}
        totalPoints={summaryStats.totalPoints}
        predictedCount={savedPredictionsCount}
        totalCount={totalPredictionsCount}
        accuracy={summaryStats.accuracy}
        maxAccuracy={summaryStats.maxAccuracy}
        useFullName={useFullName}
        onToggleFullName={rawToggleFullName}
        cardLayout={cardLayout}
        onToggleCardLayout={toggleCardLayout}
        onFilterSortPress={hasAnyChips ? handleFilterPress : undefined}
        activeFilterLabel={activeFilterLabel}
      />
    ),
    [
      isReady, emptyState, filteredFixtures.length, summaryStats,
      savedPredictionsCount, totalPredictionsCount,
      useFullName, cardLayout, toggleCardLayout, hasAnyChips, handleFilterPress,
      activeFilterLabel,
    ]
  );

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
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
    >
      <View style={{ flex: 1 }}>
        <Animated.FlatList
          ref={flatListRef}
          data={isReady ? renderItems : []}
          renderItem={flatListRenderItem}
          keyExtractor={flatListKeyExtractor}
          extraData={flatListExtraData}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            {
              paddingTop: HEADER_HEIGHT + insets.top,
              paddingBottom: FOOTER_PADDING + keyboardHeight,
            },
          ]}
          ListHeaderComponent={listHeaderComponent}
          onScroll={animatedScrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          windowSize={7}
          initialNumToRender={initialNumToRender}
          maxToRenderPerBatch={6}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
        />

        <ScoreInputNavigationBar
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          keyboardHeight={keyboardHeight}
          onDone={handleDone}
          isSaving={isSaving}
          teamName={focusedTeamInfo?.name}
          teamLogo={focusedTeamInfo?.logo}
        />

        <Animated.View
          style={[styles.headerOverlay, headerAnimatedStyle]}
          pointerEvents="box-none"
        >
          <GroupGamesHeader
            onBack={handleBack}
            backOnly
            title={groupName}
          />
        </Animated.View>

        {scrollBtnDir && !currentFocusedField && (
          <ScrollToNextButton
            direction={scrollBtnDir}
            onPress={handleScrollToNext}
            insetTop={insets.top}
            insetBottom={insets.bottom}
            keyboardHeight={keyboardHeight}
            scrollBtnAnimatedStyle={scrollBtnAnimatedStyle}
          />
        )}
      </View>

      <BottomSheetModal
        ref={filterSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderFilterBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={[styles.filterSheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Centered title */}
          <AppText style={[styles.filterSheetTitle, { color: theme.colors.textPrimary }]}>
            {t("predictions.filterAndSort", { defaultValue: "Filter & Sort" })}
          </AppText>
          {/* Divider below title */}
          <View style={[styles.filterSheetDivider, { backgroundColor: theme.colors.border }]} />
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

          {/* Group by (leagues mode only) */}
          {mode === "leagues" && (
            <>
              <View style={[styles.filterSheetDivider, { backgroundColor: theme.colors.border, marginTop: 16 }]} />
              <AppText style={[styles.filterSheetSectionLabel, { color: theme.colors.textPrimary }]}>
                {t("predictions.groupBy", { defaultValue: "Group by" })}
              </AppText>
              <View style={styles.filterSheetSortRow}>
                {(["round", "date"] as const).map((opt) => {
                  const isSelected = leaguesGroupBy === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLeaguesGroupBy(opt);
                      }}
                      style={({ pressed }) => [
                        styles.filterSheetSortChip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.textSecondary + "20",
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        },
                      ]}
                    >
                      <Text style={[styles.filterSheetSortChipText, { color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary + "90" }]}>
                        {opt === "round"
                          ? t("predictions.byRound", { defaultValue: "Round" })
                          : t("predictions.byDate", { defaultValue: "Date" })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Done button */}
          <Pressable
            onPress={handleFilterDone}
            style={({ pressed }) => [
              styles.filterSheetDoneBtn,
              { backgroundColor: theme.colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.filterSheetBtnText, { color: theme.colors.textInverse }]}>
              {t("groups.done", { defaultValue: "Done" })}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  filterSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  filterSheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingBottom: 12,
  },
  filterSheetDivider: {
    height: 1,
    marginBottom: 16,
  },
  filterSheetSectionLabel: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  filterSheetSortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterSheetSortChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  filterSheetSortChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterSheetDoneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
  },
  filterSheetBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: 12 },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sectionHeaderRow: {
  },
  sectionHeaderContent: {
    flex: 1,
    justifyContent: "center",
  },
  sectionDateRow: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionDateLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sectionRoundLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLiveText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
});
