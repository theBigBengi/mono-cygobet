import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Keyboard, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useTranslation } from "react-i18next";
import { GameSlider } from "../components/GameSlider";
import { SingleGameContent } from "../components/SingleGameContent";
import { useGroupFixture } from "../hooks/useGroupFixture";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { SAVE_PENDING_DELAY_MS } from "../utils/constants";
import type { FocusedField, PredictionMode } from "../types";

export type SingleGameScreenProps = {
  groupId: number | null;
  fixtureId: number | null;
  predictionMode: PredictionMode;
};

/**
 * Dedicated screen for viewing/editing a single game prediction.
 * Reads from group query cache (no duplicate fetch). Supports optional
 * horizontal swipe to adjacent games via GameSlider (Phase 5).
 */
export function SingleGameScreen({
  groupId,
  fixtureId,
  predictionMode,
}: SingleGameScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { fixture, allFixtures, isLoading, error } = useGroupFixture(
    groupId,
    fixtureId
  );

  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    saveAllPending,
    pending,
  } = useGroupPredictions({
    groupId,
    predictionMode,
  });

  const [currentFixtureId, setCurrentFixtureId] = useState<number | null>(
    fixtureId
  );
  const [currentFocusedField, setCurrentFocusedField] =
    useState<FocusedField>(null);
  const homeRef = useRef<TextInput | null>(null);
  const awayRef = useRef<TextInput | null>(null);

  // Expand animation — hides back button + bottom slider when card is expanded
  const expandAnim = useSharedValue(0);

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.3], [1, 0]),
    pointerEvents: expandAnim.value > 0.5 ? "none" : "auto",
  }));

  const bottomAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.3], [1, 0]),
    transform: [
      { translateY: interpolate(expandAnim.value, [0, 1], [0, 80]) },
    ],
    pointerEvents: expandAnim.value > 0.5 ? "none" : "auto",
  }));

  const handleExpandChange = useCallback(
    (expanded: boolean) => {
      expandAnim.value = withTiming(expanded ? 1 : 0, {
        duration: expanded ? 300 : 250,
        easing: expanded
          ? Easing.out(Easing.ease)
          : Easing.in(Easing.ease),
      });
    },
    [expandAnim]
  );

  useEffect(() => {
    setCurrentFixtureId(fixtureId);
  }, [fixtureId]);

  const currentFixture =
    allFixtures.find((f) => f.id === currentFixtureId) ?? fixture ?? null;
  const currentFixtureIndex =
    currentFixtureId != null
      ? allFixtures.findIndex((f) => f.id === currentFixtureId)
      : -1;

  // `pending` in the dep array triggers recomputation when slider/input changes
  const prediction = useMemo(
    () =>
      currentFixtureId != null
        ? getPrediction(currentFixtureId)
        : { home: null, away: null },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentFixtureId, pending]
  );
  const isSaved = useMemo(
    () =>
      currentFixtureId != null ? isPredictionSaved(currentFixtureId) : false,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentFixtureId, pending]
  );

  const handleFieldFocus = useCallback((fId: number, type: "home" | "away") => {
    setCurrentFocusedField({ fixtureId: fId, type });
  }, []);
  const handleFieldBlur = useCallback(() => {
    setCurrentFocusedField(null);
  }, []);

  const getNextFieldIndex = useCallback(
    (_fId: number, type: "home" | "away") => {
      return type === "home" ? 1 : -1;
    },
    []
  );
  const navigateToField = useCallback((index: number) => {
    if (index === 0) {
      homeRef.current?.focus?.();
    } else if (index === 1) {
      awayRef.current?.focus?.();
    }
  }, []);

  const handleSelectOutcome = useCallback(
    (fId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fId, outcome);
      setTimeout(() => saveAllPending(), SAVE_PENDING_DELAY_MS);
    },
    [setOutcomePrediction, saveAllPending]
  );

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      saveAllPending();
    });
    return () => listener.remove();
  }, [saveAllPending]);

  const handleSelectGame = useCallback(
    (index: number) => {
      const f = allFixtures[index];
      if (f) {
        setCurrentFixtureId(f.id);
        router.setParams({ fixtureId: String(f.id) });
        Keyboard.dismiss();
        saveAllPending();
      }
    },
    [allFixtures, router, saveAllPending]
  );

  const handleSwipeLeft = useCallback(() => {
    if (currentFixtureIndex >= 0 && currentFixtureIndex < allFixtures.length - 1) {
      handleSelectGame(currentFixtureIndex + 1);
    }
  }, [currentFixtureIndex, allFixtures.length, handleSelectGame]);

  const handleSwipeRight = useCallback(() => {
    if (currentFixtureIndex > 0) {
      handleSelectGame(currentFixtureIndex - 1);
    }
  }, [currentFixtureIndex, handleSelectGame]);

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  if (error) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  const showError = !fixture && fixtureId != null;
  if (showError || !fixture || !currentFixture) {
    if (showError) {
      return <QueryErrorView message={t("groups.failedLoadGroup")} />;
    }
    return null;
  }

  const isHomeFocused =
    currentFocusedField?.fixtureId === currentFixture.id &&
    currentFocusedField?.type === "home";
  const isAwayFocused =
    currentFocusedField?.fixtureId === currentFixture.id &&
    currentFocusedField?.type === "away";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Card — full screen, centered */}
      <SingleGameContent
        fixture={currentFixture}
        prediction={prediction}
        isSaved={isSaved}
        groupId={groupId}
        homeRef={homeRef}
        awayRef={awayRef}
        isHomeFocused={isHomeFocused}
        isAwayFocused={isAwayFocused}
        onFieldFocus={handleFieldFocus}
        onFieldBlur={handleFieldBlur}
        onUpdatePrediction={updatePrediction}
        onUpdateSliderValue={updateSliderValue}
        getNextFieldIndex={getNextFieldIndex}
        navigateToField={navigateToField}
        predictionMode={predictionMode}
        onSelectOutcome={
          predictionMode === "MatchWinner" ? handleSelectOutcome : undefined
        }
        onSwipeLeft={
          currentFixtureIndex >= 0 && currentFixtureIndex < allFixtures.length - 1
            ? handleSwipeLeft
            : undefined
        }
        onSwipeRight={
          currentFixtureIndex > 0 ? handleSwipeRight : undefined
        }
        onExpandChange={handleExpandChange}
        totalFixtures={allFixtures.length}
      />

      {/* Back button — absolute overlay at top */}
      <Animated.View
        style={[
          styles.backRow,
          { top: insets.top },
          headerAnimStyle,
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </Animated.View>

      {/* Game slider — absolute overlay at bottom */}
      {allFixtures.length > 1 && (
        <Animated.View
          style={[
            styles.bottomSlider,
            { bottom: insets.bottom },
            bottomAnimStyle,
          ]}
        >
          <GameSlider
            fixtures={allFixtures}
            currentIndex={currentFixtureIndex >= 0 ? currentFixtureIndex : 0}
            onSelectGame={handleSelectGame}
            leftOffset={0}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backRow: {
    position: "absolute",
    left: 8,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSlider: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
