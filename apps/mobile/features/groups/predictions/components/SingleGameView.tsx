import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Dimensions, Keyboard } from "react-native";
import { useTheme } from "@/lib/theme";
import { SingleGameMatchCard } from "./SingleGameMatchCard";
import { GroupGamesHeader } from "./GroupGamesHeader";
import { GameSlider } from "./GameSlider";
import { ScoreSlider } from "./ScoreSlider";
import type { FixtureItem } from "@/types/common";
import type {
  PredictionMode,
  PredictionsByFixtureId,
  FocusedField,
} from "../types";

type Props = {
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
  fixtures,
  predictions,
  savedPredictions,
  inputRefs,
  currentFocusedField,
  setCurrentFocusedField,
  onUpdatePrediction,
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

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      Keyboard.dismiss();
      onSaveAllChanged();
    }
  };

  const handleNext = () => {
    if (currentIndex < fixtures.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      Keyboard.dismiss();
      onSaveAllChanged();
    }
  };

  const handleSelectGame = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Keyboard.dismiss();
    onSaveAllChanged();
  };

  // Save when keyboard is dismissed in single view
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        onSaveAllChanged();
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [onSaveAllChanged]);

  const handleScrollToIndexFailed = (info: { index: number }) => {
    const wait = new Promise((resolve) => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
      });
    });
  };

  const renderItem = ({
    item: fixture,
    index,
  }: {
    item: FixtureItem;
    index: number;
  }) => {
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

    const isSaved = savedPredictions.has(fixture.id);

    return (
      <View style={[styles.gameContainer, { width: SCREEN_WIDTH }]}>
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
            // In single view, auto-next can advance to next game if at end of current game
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
      </View>
    );
  };

  if (fixtures.length === 0) {
    return null;
  }

  const currentFixture = fixtures[currentIndex];
  const currentFixtureId = currentFixture?.id;
  const currentPrediction = currentFixtureId
    ? predictions[String(currentFixtureId)] || { home: null, away: null }
    : { home: null, away: null };

  const handleSliderChange = (side: "home" | "away", val: number | null) => {
    if (currentFixtureId == null) return;

    const otherSide = side === "home" ? "away" : "home";
    const otherValue = currentPrediction[otherSide];

    if (val != null && otherValue == null) {
      // Moving from "-" to a number → reset other slider to 0
      onUpdatePrediction(currentFixtureId, otherSide, "0");
    } else if (val == null && otherValue != null) {
      // Moving to "-" → clear other slider too
      onUpdatePrediction(currentFixtureId, otherSide, "");
    }

    // Update this slider's value
    onUpdatePrediction(currentFixtureId, side, val != null ? String(val) : "");
  };

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
        {/* Vertical score sliders - full height, left and right */}
        <ScoreSlider
          side="home"
          value={currentPrediction.home}
          onValueChange={(val) => handleSliderChange("home", val)}
        />
        <ScoreSlider
          side="away"
          value={currentPrediction.away}
          onValueChange={(val) => handleSliderChange("away", val)}
        />

        {/* FlatList for games - takes full width */}
        <FlatList
          ref={flatListRef}
          data={fixtures}
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
    // width: "100%",
    position: "relative",
  },
  flatList: {
    width: SCREEN_WIDTH,
  },
  gameContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    // paddingTop: 16,
    // paddingBottom: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
