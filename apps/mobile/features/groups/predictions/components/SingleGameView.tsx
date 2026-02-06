import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Keyboard,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { SingleGameMatchCard } from "./SingleGameMatchCard";
import { GroupGamesHeader } from "./GroupGamesHeader";
import { GameSlider } from "./GameSlider";
import { GameDetailTabs } from "./GameDetailTabs";
import type { TabId } from "./GameDetailTabs";
import { HorizontalScoreSlider } from "./HorizontalScoreSlider";
import { FixturePredictionsList } from "./FixturePredictionsList";
import { MyPredictionsList } from "./MyPredictionsList";
import { getAwaySliderColor } from "../utils/color-helpers";
import { canPredict } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type {
  PredictionMode,
  PredictionsByFixtureId,
  FocusedField,
} from "../types";

type SingleGamePageProps = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  isSaved: boolean;
  groupId: number | null;
  homeRef: React.RefObject<any> | undefined;
  awayRef: React.RefObject<any> | undefined;
  isHomeFocused: boolean;
  isAwayFocused: boolean;
  onFieldFocus: (fixtureId: number, type: "home" | "away") => void;
  onFieldBlur: (fixtureId: number) => void;
  onUpdatePrediction: (
    fixtureId: number,
    type: "home" | "away",
    text: string,
    onAutoNext?: (fixtureId: number, type: "home" | "away") => void
  ) => void;
  onUpdateSliderValue?: (
    fixtureId: number,
    side: "home" | "away",
    val: number | null
  ) => void;
  getNextFieldIndex: (fixtureId: number, type: "home" | "away") => number;
  navigateToField: (index: number) => void;
  predictionMode: PredictionMode;
  onSelectOutcome?: (
    fixtureId: number,
    outcome: "home" | "draw" | "away"
  ) => void;
};

const SingleGamePage = React.memo(function SingleGamePage({
  fixture,
  prediction,
  isSaved,
  groupId,
  homeRef,
  awayRef,
  isHomeFocused,
  isAwayFocused,
  onFieldFocus,
  onFieldBlur,
  onUpdatePrediction,
  onUpdateSliderValue,
  getNextFieldIndex,
  navigateToField,
  predictionMode,
  onSelectOutcome,
}: SingleGamePageProps) {
  const { t } = useTranslation("common");

  const isEditable = canPredict(fixture.state, fixture.startTs);
  const defaultTab: TabId = isEditable ? "predict" : "predictions";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const tabs = [
    ...(isEditable
      ? [{ id: "predict" as const, label: t("predictions.predict") }]
      : []),
    ...(!isEditable
      ? [{ id: "predictions" as const, label: t("predictions.predictions") }]
      : []),
    { id: "statistics" as const, label: t("predictions.statistics") },
  ];

  const handleSliderChange = useCallback(
    (side: "home" | "away", val: number | null) => {
      if (onUpdateSliderValue) {
        onUpdateSliderValue(fixture.id, side, val);
      }
    },
    [fixture.id, onUpdateSliderValue]
  );

  return (
    <View style={[styles.gameContainer, { width: SCREEN_WIDTH }]}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gameScrollContent}
      >
        <SingleGameMatchCard
          fixture={fixture}
          prediction={prediction}
          homeRef={homeRef}
          awayRef={awayRef}
          homeFocused={isHomeFocused}
          awayFocused={isAwayFocused}
          isSaved={isSaved}
          onFocus={(type) => onFieldFocus(fixture.id, type)}
          onBlur={() => onFieldBlur(fixture.id)}
          onChange={(type, text) => onUpdatePrediction(fixture.id, type, text)}
          onAutoNext={(type) => {
            const nextIndex = getNextFieldIndex(fixture.id, type);
            if (nextIndex >= 0) {
              navigateToField(nextIndex);
            }
          }}
          predictionMode={predictionMode}
          onSelectOutcome={
            onSelectOutcome
              ? (outcome) => onSelectOutcome(fixture.id, outcome)
              : undefined
          }
        />
        <GameDetailTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
        {activeTab === "predict" && (
          <>
            <HorizontalScoreSlider
              side="home"
              value={prediction.home}
              onValueChange={(val) => handleSliderChange("home", val)}
              teamImagePath={fixture.homeTeam?.imagePath}
              teamName={fixture.homeTeam?.name}
              thumbColor={fixture.homeTeam?.firstKitColor ?? "#22C55E"}
            />
            <HorizontalScoreSlider
              side="away"
              value={prediction.away}
              onValueChange={(val) => handleSliderChange("away", val)}
              teamImagePath={fixture.awayTeam?.imagePath}
              teamName={fixture.awayTeam?.name}
              thumbColor={getAwaySliderColor(
                fixture.homeTeam?.firstKitColor,
                fixture.awayTeam?.secondKitColor,
                fixture.awayTeam?.thirdKitColor,
                "#3B82F6"
              )}
            />
            <MyPredictionsList
              fixtureId={fixture.id}
              currentGroupId={groupId}
            />
          </>
        )}
        {activeTab === "predictions" && (
          <FixturePredictionsList groupId={groupId} fixtureId={fixture.id} />
        )}
        {activeTab === "statistics" && (
          <View style={styles.placeholderContainer}>
            <AppText variant="body" color="secondary">
              {t("predictions.statistics")}
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

type Props = {
  /** Whether this view is currently visible (not hidden by display: "none"). */
  isVisible: boolean;
  groupId: number | null;
  fixtures: FixtureItem[];
  predictions: PredictionsByFixtureId;
  savedPredictions: Set<number>;
  inputRefs: React.MutableRefObject<
    Record<string, { home: React.RefObject<any>; away: React.RefObject<any> }>
  >;
  currentFocusedField: FocusedField;
  setCurrentFocusedField: (field: FocusedField) => void;
  onUpdatePrediction: (
    fixtureId: number,
    type: "home" | "away",
    text: string,
    onAutoNext?: (fixtureId: number, type: "home" | "away") => void
  ) => void;
  onUpdateSliderValue?: (
    fixtureId: number,
    side: "home" | "away",
    val: number | null
  ) => void;
  onFieldFocus: (fixtureId: number, type: "home" | "away") => void;
  onFieldBlur: (fixtureId: number) => void;
  getNextFieldIndex: (fixtureId: number, type: "home" | "away") => number;
  navigateToField: (index: number) => void;
  onSaveAllChanged: () => void;
  predictionMode?: PredictionMode;
  onSelectOutcome?: (
    fixtureId: number,
    outcome: "home" | "draw" | "away"
  ) => void;
  /** Initial game index to scroll to (default 0). */
  initialIndex?: number;
  /** Called when user taps back (single view as own page). */
  onBack: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function SingleGameView({
  isVisible,
  groupId,
  fixtures,
  predictions,
  savedPredictions,
  inputRefs,
  currentFocusedField,
  setCurrentFocusedField,
  onUpdatePrediction,
  onUpdateSliderValue,
  onFieldFocus,
  onFieldBlur,
  getNextFieldIndex,
  navigateToField,
  onSaveAllChanged,
  predictionMode = "CorrectScore",
  onSelectOutcome,
  initialIndex,
  onBack,
}: Props) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const flatListRef = useRef<FlatList>(null);

  // Sync index and scroll when initialIndex changes (e.g. re-open from a different card).
  useEffect(() => {
    if (initialIndex != null) {
      setCurrentIndex(initialIndex);
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    }
  }, [initialIndex]);

  const handleSelectGame = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Keyboard.dismiss();
    onSaveAllChanged();
  };

  // Save when keyboard is dismissed in single view (only when visible to avoid double-save)
  useEffect(() => {
    if (!isVisible) return;

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        onSaveAllChanged();
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [onSaveAllChanged, isVisible]);

  const handleScrollToIndexFailed = (info: { index: number }) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
      });
    });
  };

  const renderItem = useCallback(
    ({ item: fixture }: { item: FixtureItem }) => {
      const fixtureIdStr = String(fixture.id);
      const prediction = predictions[fixtureIdStr] || {
        home: null,
        away: null,
      };
      const isSaved = savedPredictions.has(fixture.id);
      const isHomeFocused =
        currentFocusedField?.fixtureId === fixture.id &&
        currentFocusedField.type === "home";
      const isAwayFocused =
        currentFocusedField?.fixtureId === fixture.id &&
        currentFocusedField.type === "away";
      const homeRef = inputRefs.current[fixtureIdStr]?.home;
      const awayRef = inputRefs.current[fixtureIdStr]?.away;

      return (
        <SingleGamePage
          fixture={fixture}
          prediction={prediction}
          isSaved={isSaved}
          groupId={groupId}
          homeRef={homeRef}
          awayRef={awayRef}
          isHomeFocused={isHomeFocused}
          isAwayFocused={isAwayFocused}
          onFieldFocus={onFieldFocus}
          onFieldBlur={onFieldBlur}
          onUpdatePrediction={onUpdatePrediction}
          onUpdateSliderValue={onUpdateSliderValue}
          getNextFieldIndex={getNextFieldIndex}
          navigateToField={navigateToField}
          predictionMode={predictionMode}
          onSelectOutcome={onSelectOutcome}
        />
      );
    },
    [
      predictions,
      savedPredictions,
      currentFocusedField,
      groupId,
      inputRefs,
      onFieldFocus,
      onFieldBlur,
      onUpdatePrediction,
      onUpdateSliderValue,
      getNextFieldIndex,
      navigateToField,
      predictionMode,
      onSelectOutcome,
    ]
  );

  if (fixtures.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <GroupGamesHeader backOnly onBack={onBack} />
      <GameSlider
        fixtures={fixtures}
        currentIndex={currentIndex}
        onSelectGame={handleSelectGame}
      />
      <View style={[styles.contentContainer, { flex: 1 }]}>
        {/* FlatList for games - takes full width */}
        <FlatList
          ref={flatListRef}
          data={fixtures}
          extraData={predictions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex ?? 0}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            if (index >= 0 && index < fixtures.length) {
              setCurrentIndex(index);
            }
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={styles.flatList}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  flatList: {
    width: SCREEN_WIDTH,
  },
  gameContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  gameScrollContent: {
    paddingBottom: 24,
  },
  placeholderContainer: {
    padding: 16,
    alignItems: "center",
  },
});
