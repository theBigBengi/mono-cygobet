import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useTranslation } from "react-i18next";
import { canPredict } from "@repo/utils";
import { useGroupFixture } from "../hooks/useGroupFixture";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { useVerticalPager } from "../hooks/useVerticalPager";
import { PeekCard } from "../components/PeekCard";
import { PredictAllCardSkeleton } from "../components/PredictAllCardSkeleton";
import { getCardLayout } from "../utils/peekCardLayout";
import type { PredictionMode } from "../types";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export type SingleGameScreenProps = {
  groupId: number | null;
  fixtureId: number | null;
  /** Optional — if omitted, derived from group data */
  predictionMode?: PredictionMode;
};

/**
 * Lightweight shell — mounts instantly so the native push animation plays
 * without being blocked by heavy hooks. The heavy content mounts after
 * two animation frames (double-RAF), by which time the transition is underway.
 */
export function SingleGameScreen(props: SingleGameScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const HEADER_HEIGHT = insets.top + 36 + 4;
  const { CARD_HEIGHT } = getCardLayout(SCREEN_HEIGHT);

  useEffect(() => {
    // Double-RAF: commit the skeleton frame, then schedule heavy render
    let id1: number;
    let id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setIsReady(true);
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.textPrimary + "0F" }]} />

      {isReady ? (
        <SingleGameContent {...props} />
      ) : (
        <PredictAllCardSkeleton
          cardHeight={CARD_HEIGHT}
          contentTop={HEADER_HEIGHT}
        />
      )}

      {/* Header — always visible, even during transition */}
      <View
        style={[styles.screenHeader, { paddingTop: insets.top }]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.screenHeaderBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <AppText
          variant="body"
          style={styles.screenHeaderTitle}
          numberOfLines={1}
        >
          {""}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Heavy inner content — only mounted after the push transition starts.
 * Contains all the expensive hooks and PeekCard rendering.
 */
function SingleGameContent({
  groupId,
  fixtureId,
  predictionMode: predictionModeProp,
}: SingleGameScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const { fixture, allFixtures, group, isLoading, error } = useGroupFixture(
    groupId,
    fixtureId
  );

  // Derive prediction mode from group data (or use prop if provided)
  const predictionMode: PredictionMode = predictionModeProp
    ?? (group?.predictionMode === "MatchWinner" ? "MatchWinner" : "CorrectScore");

  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    saveAllPending,
  } = useGroupPredictions({ groupId, predictionMode });

  const saveAllPendingRef = React.useRef(saveAllPending);
  saveAllPendingRef.current = saveAllPending;

  const savePending = useCallback(() => {
    saveAllPendingRef.current();
  }, []);

  const HEADER_HEIGHT = insets.top + 36 + 4;
  const CONTENT_TOP = HEADER_HEIGHT;
  const { CARD_HEIGHT, STEP, EXPAND_AMOUNT } = getCardLayout(SCREEN_HEIGHT);
  const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.65;

  // If the initial fixture is finished → single expanded card, no strip
  const isFinishedGame = fixture != null && !canPredict(fixture.state, fixture.startTs);

  // Strip only contains predictable fixtures
  const predictableFixtures = React.useMemo(
    () => allFixtures.filter((f) => canPredict(f.state, f.startTs)),
    [allFixtures]
  );
  const stripFixtures = isFinishedGame ? [] : predictableFixtures;

  // Find initial index from fixtureId within predictable fixtures
  const initialIndex =
    fixtureId != null
      ? Math.max(
          0,
          stripFixtures.findIndex((f) => f.id === fixtureId)
        )
      : 0;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexSV = useSharedValue(initialIndex);
  const translateY = useSharedValue(0);
  const expandProgress = useSharedValue(isFinishedGame ? 1 : 0);

  // Sync when fixtureId prop changes
  useEffect(() => {
    if (fixtureId != null && !isFinishedGame) {
      const idx = stripFixtures.findIndex((f) => f.id === fixtureId);
      if (idx >= 0) {
        currentIndexSV.value = idx;
        setCurrentIndex(idx);
      }
    }
  }, [fixtureId, stripFixtures, isFinishedGame, currentIndexSV]);

  const updateRouterParams = useCallback(
    (index: number) => {
      const f = stripFixtures[index];
      if (f) {
        router.setParams({ fixtureId: String(f.id) });
      }
    },
    [stripFixtures, router]
  );

  const onIndexChange = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      updateRouterParams(index);
    },
    [updateRouterParams]
  );

  const totalCards = stripFixtures.length;

  const { panGesture, stripStyle } = useVerticalPager({
    totalCards,
    expandProgress,
    currentIndexSV,
    translateY,
    step: STEP,
    swipeThreshold: SWIPE_THRESHOLD,
    onSavePending: savePending,
    onIndexChange,
  });

  // Data still loading
  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  if (error) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  // Fixtures loaded but target fixture not found yet — show loading
  // (can happen when placeholder data is provided without fixtures)
  if (!fixture && fixtureId != null && allFixtures.length === 0) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  // Fixtures loaded but target fixture doesn't exist — show error
  if (!fixture && fixtureId != null && allFixtures.length > 0) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  if (allFixtures.length === 0) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }

  return (
    <>
      {isFinishedGame && fixture ? (
        /* Single expanded card for finished games */
        <View style={styles.viewport}>
          <PeekCard
            fixture={fixture}
            index={0}
            cardHeight={SCREEN_HEIGHT}
            expandAmount={0}
            expandProgress={expandProgress}
            contentTop={CONTENT_TOP}
            step={STEP}
            cardBackground={theme.colors.cardBackground}
            currentIndexSV={currentIndexSV}
            translateY={translateY}
            prediction={getPrediction(fixture.id)}
            isSaved={isPredictionSaved(fixture.id)}
            onUpdatePrediction={updatePrediction}
            onUpdateSliderValue={updateSliderValue}
            isInteractive={false}
            isFinishedGame
            totalCards={1}
          />
        </View>
      ) : (
        /* Viewport — clips the strip for predictable games */
        <View style={styles.viewport}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={stripStyle}>
              {stripFixtures.map((f, i) => (
                <PeekCard
                  key={f.id}
                  fixture={f}
                  index={i}
                  cardHeight={CARD_HEIGHT}
                  expandAmount={EXPAND_AMOUNT}
                  expandProgress={expandProgress}
                  contentTop={CONTENT_TOP}
                  step={STEP}
                  cardBackground={theme.colors.cardBackground}
                  currentIndexSV={currentIndexSV}
                  translateY={translateY}
                  prediction={getPrediction(f.id)}
                  isSaved={isPredictionSaved(f.id)}
                  onUpdatePrediction={updatePrediction}
                  onUpdateSliderValue={updateSliderValue}
                  isInteractive={currentIndex === i}
                  isNearby={Math.abs(currentIndex - i) <= 1}
                  totalCards={stripFixtures.length}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {/* Header with group name — overlays the cards */}
      <View
        style={[styles.screenHeader, { paddingTop: insets.top }]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.screenHeaderBack}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <AppText
          variant="body"
          style={styles.screenHeaderTitle}
          numberOfLines={1}
        >
          {group?.name ?? ""}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewport: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  screenHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  screenHeaderBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  screenHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 36,
  },
});
