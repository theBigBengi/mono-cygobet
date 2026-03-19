import React, { useMemo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Keyboard, Alert, Text, Pressable, InteractionManager, type ListRenderItemInfo } from "react-native";
import Animated, { withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/components/ui";
import { useTheme, spacing, radius } from "@/lib/theme";
import {
  ScoreInputNavigationBar,
  GroupFixtureCard,
} from "../components";
import { RoundPickerSheet } from "../components/RoundPickerSheet";
import { WeekPickerSheet } from "../components/WeekPickerSheet";
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

  const toggleFullName = useCallback(() => {
    rawToggleFullName();
  }, [rawToggleFullName]);

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
    selectRound,
    navigateRound,
    selectWeek,
    navigateWeek,
    filteredFixtures,
    emptyState,
  } = useSmartFilters({
    fixtures,
    mode,
    groupTeamsIds,
    onNavigateToLeaderboard: navigateToLeaderboard,
  });

  const skipGrouping =
    (mode === "leagues" && selectedAction === "round") ||
    ((mode === "games" || mode === "teams") && selectedAction === "week");
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
        if (maxPoints > 0 && f.prediction?.points != null && f.prediction.points >= maxPoints) {
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

  // Round navigation for leagues mode
  const roundPickerRef = useRef<BottomSheetModal>(null);
  const roundsFilter = structuralFilter?.type === "rounds" ? structuralFilter : null;

  const roundNav = useMemo(() => {
    if (mode !== "leagues" || !roundsFilter) return undefined;
    const isActionMode = selectedAction && selectedAction !== "round";
    const rounds = roundsFilter.allRounds.map((r) => r.round);
    const idx = rounds.indexOf(roundsFilter.selectedRound);
    const actionLabels: Record<string, string> = {
      all: "All Games",
      predict: "To Predict",
      results: "Results",
    };
    return {
      selectedRound: roundsFilter.selectedRound,
      canGoPrev: isActionMode ? false : idx > 0,
      canGoNext: isActionMode ? false : idx >= 0 && idx < rounds.length - 1,
      labelOverride: isActionMode ? actionLabels[selectedAction] : undefined,
    };
  }, [mode, roundsFilter, selectedAction]);

  const handleRoundPrev = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateRound("prev");
  }, [navigateRound]);

  const handleRoundNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateRound("next");
  }, [navigateRound]);

  const handleOpenRoundPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    roundPickerRef.current?.present();
  }, []);

  // Week navigation for games/teams mode
  const weekPickerRef = useRef<BottomSheetModal>(null);
  const weeksFilter = structuralFilter?.type === "weeks" ? structuralFilter : null;

  const weekNav = useMemo(() => {
    if ((mode !== "games" && mode !== "teams") || !weeksFilter) return undefined;
    const isActionMode = selectedAction && selectedAction !== "week";
    const keys = weeksFilter.allWeeks.map((w) => w.key);
    const idx = keys.indexOf(weeksFilter.selectedWeek);
    const currentWeekInfo = weeksFilter.allWeeks.find((w) => w.key === weeksFilter.selectedWeek);
    const actionLabels: Record<string, string> = {
      all: "All Games",
      predict: "To Predict",
      results: "Results",
    };
    return {
      selectedRound: weeksFilter.selectedWeek,
      canGoPrev: isActionMode ? false : idx > 0,
      canGoNext: isActionMode ? false : idx >= 0 && idx < keys.length - 1,
      labelOverride: isActionMode
        ? actionLabels[selectedAction]
        : currentWeekInfo?.label,
    };
  }, [mode, weeksFilter, selectedAction]);

  const handleWeekPrev = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateWeek("prev");
  }, [navigateWeek]);

  const handleWeekNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateWeek("next");
  }, [navigateWeek]);

  const handleOpenWeekPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    weekPickerRef.current?.present();
  }, []);

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
        // Date header — large, bold date label
        if (item.level === "date" && item.label) {
          return (
            <View style={styles.sectionDateHeader}>
              <Text
                style={[styles.sectionDateLabel, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        }

        // League header — logo + name + optional round
        if (item.level === "league" && item.label) {
          return (
            <View style={styles.sectionLeagueHeader}>
              <View style={styles.sectionLeagueInfo}>
                <Text
                  style={[styles.sectionLeagueLabel, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.round ? (
                  <Text style={[styles.sectionLeagueRound, { color: theme.colors.textSecondary }]}>
                    R{item.round}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }

        // Live badge
        if (item.isLive) {
          return (
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionLiveBadge, { backgroundColor: theme.colors.live + "15" }]}>
                <View style={[styles.sectionLiveDot, { backgroundColor: theme.colors.live }]} />
                <Text style={[styles.sectionLiveText, { color: theme.colors.live }]}>LIVE</Text>
              </View>
            </View>
          );
        }

        // Round header
        if (item.level === "round" && item.label) {
          return (
            <View style={styles.sectionDateRow}>
              <Text
                style={[styles.sectionRoundLabel, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        }

        return null;
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
        onToggleFullName={toggleFullName}
        cardLayout={cardLayout}
        onToggleCardLayout={toggleCardLayout}
        onFilterSortPress={undefined}
        activeFilterLabel={activeFilterLabel}
        roundNav={roundNav ? {
          ...roundNav,
          onPrev: handleRoundPrev,
          onNext: handleRoundNext,
          onOpenPicker: handleOpenRoundPicker,
        } : weekNav ? {
          ...weekNav,
          onPrev: handleWeekPrev,
          onNext: handleWeekNext,
          onOpenPicker: handleOpenWeekPicker,
        } : undefined}
      />
    ),
    [
      isReady, emptyState, filteredFixtures.length, summaryStats,
      savedPredictionsCount, totalPredictionsCount,
      useFullName, toggleFullName, cardLayout, toggleCardLayout,
      activeFilterLabel, roundNav, handleRoundPrev, handleRoundNext, handleOpenRoundPicker,
      weekNav, handleWeekPrev, handleWeekNext, handleOpenWeekPicker, mode,
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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={{ flex: 1 }}>
        <Animated.FlatList
          key={cardLayout}
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
          windowSize={5}
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

      {/* Round picker for leagues mode */}
      {roundsFilter && (
        <RoundPickerSheet
          sheetRef={roundPickerRef}
          rounds={roundsFilter.allRounds}
          selectedRound={roundsFilter.selectedRound}
          onSelectRound={selectRound}
          selectedAction={selectedAction}
          onSelectAction={selectAction}
        />
      )}

      {/* Week picker for games/teams mode */}
      {weeksFilter && (
        <WeekPickerSheet
          sheetRef={weekPickerRef}
          weeks={weeksFilter.allWeeks}
          selectedWeek={weeksFilter.selectedWeek}
          onSelectWeek={selectWeek}
          selectedAction={selectedAction}
          onSelectAction={selectAction}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.ms },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sectionHeaderRow: {
  },
  sectionDateHeader: {
    paddingTop: spacing.ml,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLeagueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.ms,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLeagueInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: radius.xs,
  },
  sectionLeagueLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  sectionLeagueRound: {
    fontSize: 11,
    fontWeight: "500",
  },
  sectionDateRow: {
    paddingTop: spacing.md,
    paddingBottom: spacing.ms,
  },
  sectionDateLabel: {
    fontSize: 13,
    fontWeight: "700",
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
    paddingHorizontal: radius.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
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
    padding: spacing.ml,
  },
});
