import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Keyboard,
} from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { SingleGameMatchCard } from "./SingleGameMatchCard";
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
}: Props) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
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

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Navigation buttons and FlatList */}
      <View style={styles.contentContainer}>
        {/* Previous button - positioned absolutely on left */}
        <Pressable
          style={[
            styles.navButton,
            styles.navButtonLeft,
            currentIndex === 0 && styles.navButtonDisabled,
            { borderColor: theme.colors.border },
          ]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={
              currentIndex === 0
                ? theme.colors.textSecondary
                : theme.colors.textPrimary
            }
          />
        </Pressable>

        {/* Game indicator - positioned absolutely in center top */}
        <View style={styles.indicatorContainer}>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.indicatorText}
          >
            Game {currentIndex + 1} of {fixtures.length}
          </AppText>
        </View>

        {/* FlatList for games - takes full width */}
        <FlatList
          ref={flatListRef}
          data={fixtures}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={0}
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

        {/* Next button - positioned absolutely on right */}
        <Pressable
          style={[
            styles.navButton,
            styles.navButtonRight,
            currentIndex === fixtures.length - 1 && styles.navButtonDisabled,
            { borderColor: theme.colors.border },
          ]}
          onPress={handleNext}
          disabled={currentIndex === fixtures.length - 1}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              currentIndex === fixtures.length - 1
                ? theme.colors.textSecondary
                : theme.colors.textPrimary
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  indicatorContainer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
    marginTop: -10,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: "500",
  },
  contentContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  flatList: {
    width: SCREEN_WIDTH,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    position: "absolute",
    top: "50%",
    marginTop: -20,
    zIndex: 10,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  gameContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
