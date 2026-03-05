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
import { useGroupedFixtures } from "../hooks/useGroupedFixtures";
import { usePredictionsStats } from "../hooks/usePredictionsStats";
import { useCollapsingHeader } from "../hooks/useCollapsingHeader";
import { useScrollToNextButton } from "../hooks/useScrollToNextButton";
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

  const [cardLayout, setCardLayout] = useState<"vertical" | "horizontal">("vertical");
  const toggleCardLayout = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCardLayout((prev) => (prev === "vertical" ? "horizontal" : "vertical"));
  }, []);

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
    let totalSettled = 0;

    filteredFixtures.forEach((f) => {
      if (f.prediction?.points != null && f.prediction.points > 0) {
        totalPoints += f.prediction.points;
        settledWithPoints++;
      }
      if (f.prediction?.settled) {
        totalSettled++;
      }
    });

    const accuracy =
      totalSettled > 0
        ? Math.round((settledWithPoints / totalSettled) * 100)
        : 0;
    return { totalPoints, accuracy };
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

  React.useEffect(() => {
    const map = new Map<number, number>();
    renderItems.forEach((item, i) => {
      if (item.type === "card") {
        map.set(item.fixture.id, i);
      }
    });
    updateFixtureIndexMap(map);
  }, [renderItems, updateFixtureIndexMap]);

  const filterSheetRef = useRef<BottomSheetModal>(null);

  // Draft state for filter sheet — only committed on Apply
  const [draftAction, setDraftAction] = useState(selectedAction);
  const [draftTeamId, setDraftTeamId] = useState<number | null>(
    structuralFilter?.type === "teams" ? structuralFilter.selectedTeamId : null
  );
  const [draftCompetitionId, setDraftCompetitionId] = useState<number | null>(
    structuralFilter?.type === "teams" ? structuralFilter.selectedCompetitionId : null
  );
  const [draftRound, setDraftRound] = useState<string>(
    structuralFilter?.type === "rounds" ? structuralFilter.selectedRound : ""
  );

  const handleFilterPress = useCallback(() => {
    // Sync draft state to current real state when opening
    setDraftAction(selectedAction);
    if (structuralFilter?.type === "teams") {
      setDraftTeamId(structuralFilter.selectedTeamId);
      setDraftCompetitionId(structuralFilter.selectedCompetitionId);
    }
    if (structuralFilter?.type === "rounds") {
      setDraftRound(structuralFilter.selectedRound);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    filterSheetRef.current?.present();
  }, [selectedAction, structuralFilter]);

  const handleFilterApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    selectAction(draftAction);
    if (structuralFilter?.type === "teams") {
      selectTeam(draftTeamId);
      selectCompetition(draftCompetitionId);
    }
    if (structuralFilter?.type === "rounds" && draftRound) {
      selectRound(draftRound);
    }
    filterSheetRef.current?.dismiss();
  }, [draftAction, draftTeamId, draftCompetitionId, draftRound, selectAction, selectTeam, selectCompetition, selectRound, structuralFilter]);

  const handleFilterCancel = useCallback(() => {
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
    () => ({ pending, currentFocusedField, highlightedFixtureId, nextToPredictId, cardLayout }),
    [pending, currentFocusedField, highlightedFixtureId, nextToPredictId, cardLayout]
  );

  React.useEffect(() => {
    if (scrollToFixtureId == null || !isReady) return;
    if (initialScrollDone.current) return;

    initialScrollDone.current = true;

    setTimeout(() => {
      scrollToMatchCard(scrollToFixtureId);
    }, 100);
  }, [scrollToFixtureId, isReady, scrollToMatchCard]);

  const handleDone = useCallback(() => {
    handleSaveAllChanged();
    Keyboard.dismiss();
  }, [handleSaveAllChanged]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handlePressCard = useCallback(
    (fixtureId: number) => {
      if (groupId != null) {
        saveAllPending();
        router.push(`/groups/${groupId}/fixtures/${fixtureId}`);
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
              ) : item.level === "date" ? (
                <View style={styles.sectionDateRow}>
                  <Text
                    style={[
                      styles.sectionDateLabel,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
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
          hideRound={mode === "leagues"}
          cardLayout={cardLayout}
        />
      );
    },
    [
      theme, inputRefs, matchCardRefs, predictionModeTyped, groupName,
      matchNumbersMap, maxPoints, handleFieldFocus, handleFieldBlur,
      handleCardChange, handleAutoNext, predictionMode, handleSelectOutcome,
      scrollToMatchCard, handlePressCard, getPrediction, isPredictionSaved,
      cardLayout,
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
      />
    ),
    [
      isReady, emptyState, filteredFixtures.length, summaryStats,
      savedPredictionsCount, totalPredictionsCount,
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
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewOffset: SCROLL_OFFSET,
              });
            }, 200);
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
            onFilterPress={hasAnyChips ? handleFilterPress : undefined}
            rightContent={
              <Pressable onPress={toggleCardLayout} style={styles.layoutToggle}>
                <Ionicons
                  name={cardLayout === "vertical" ? "reorder-two-outline" : "list-outline"}
                  size={20}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
            }
          />
        </Animated.View>

        {scrollBtnDir && (
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
            selectedAction={draftAction}
            onSelectAction={setDraftAction}
            structuralFilter={
              structuralFilter
                ? structuralFilter.type === "teams"
                  ? { ...structuralFilter, selectedTeamId: draftTeamId, selectedCompetitionId: draftCompetitionId }
                  : structuralFilter.type === "rounds"
                    ? { ...structuralFilter, selectedRound: draftRound || structuralFilter.selectedRound }
                    : structuralFilter
                : null
            }
            onSelectTeam={setDraftTeamId}
            onSelectCompetition={setDraftCompetitionId}
            onSelectRound={setDraftRound}
            onNavigateRound={navigateRound}
          />

          {/* Cancel / Apply buttons */}
          <View style={styles.filterSheetButtonRow}>
            <Pressable
              onPress={handleFilterCancel}
              style={({ pressed }) => [
                styles.filterSheetCancelBtn,
                { borderColor: theme.colors.textSecondary + "60" },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.filterSheetBtnText, { color: theme.colors.textPrimary }]}>
                {t("groups.cancel", { defaultValue: "Cancel" })}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleFilterApply}
              style={({ pressed }) => [
                styles.filterSheetApplyBtn,
                { backgroundColor: theme.colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.filterSheetBtnText, { color: "#fff" }]}>
                {t("groups.apply", { defaultValue: "Apply" })}
              </Text>
            </Pressable>
          </View>
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
  filterSheetButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  filterSheetCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterSheetApplyBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
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
    paddingLeft: 4,
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
  },
  sectionRoundLabel: {
    fontSize: 11,
    fontWeight: "600",
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
  layoutToggle: {
    padding: 8,
  },
});
