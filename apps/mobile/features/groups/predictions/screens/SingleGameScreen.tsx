import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useTranslation } from "react-i18next";
import { canPredict } from "@repo/utils";
import * as Haptics from "expo-haptics";
import { useGroupFixture } from "../hooks/useGroupFixture";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { VerticalScoreSlider } from "../components/VerticalScoreSlider";
import { ScoresInput } from "../components/ScoresInput";
import { getAwaySliderColor } from "../utils/color-helpers";
import { formatKickoffDateTime } from "@/utils/fixture";
import type { PredictionMode } from "../types";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.65;
const CARD_GAP = 12;
const PEEK = 48;

export type SingleGameScreenProps = {
  groupId: number | null;
  fixtureId: number | null;
  predictionMode: PredictionMode;
};

/**
 * Dedicated screen for viewing/editing a single game prediction.
 * Vertical pager strip — cards stack vertically, swipe to navigate.
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

  const { fixture, allFixtures, group, isLoading, error } = useGroupFixture(
    groupId,
    fixtureId
  );

  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    saveAllPending,
  } = useGroupPredictions({ groupId, predictionMode });

  const saveAllPendingRef = useRef(saveAllPending);
  saveAllPendingRef.current = saveAllPending;

  const savePending = useCallback(() => {
    saveAllPendingRef.current();
  }, []);

  const HEADER_HEIGHT = insets.top + 36 + 4; // safeArea + button + paddingBottom
  const CONTENT_TOP = HEADER_HEIGHT;
  const VISIBLE_HEIGHT = SCREEN_HEIGHT;
  const CARD_HEIGHT = VISIBLE_HEIGHT - PEEK - CARD_GAP;
  const STEP = CARD_HEIGHT + CARD_GAP;

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

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onStart(() => {
      if (expandProgress.value > 0) return;
    })
    .onUpdate((e) => {
      if (expandProgress.value > 0) return;
      const idx = currentIndexSV.value;
      if (
        (idx === 0 && e.translationY > 0) ||
        (idx === totalCards - 1 && e.translationY < 0)
      ) {
        translateY.value = e.translationY * 0.25;
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (expandProgress.value > 0) return;
      const idx = currentIndexSV.value;
      const flingUp =
        (e.translationY < -SWIPE_THRESHOLD || e.velocityY < -500) &&
        idx < totalCards - 1;
      const flingDown =
        (e.translationY > SWIPE_THRESHOLD || e.velocityY > 500) && idx > 0;

      if (flingUp) {
        expandProgress.value = 0;
        runOnJS(savePending)();
        translateY.value = withTiming(-STEP, { duration: 300 }, () => {
          currentIndexSV.value += 1;
          translateY.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else if (flingDown) {
        expandProgress.value = 0;
        runOnJS(savePending)();
        translateY.value = withTiming(STEP, { duration: 300 }, () => {
          currentIndexSV.value -= 1;
          translateY.value = 0;
          runOnJS(onIndexChange)(currentIndexSV.value);
        });
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(currentIndexSV.value * STEP) + translateY.value },
    ],
  }));

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  if (error) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  if (!fixture && fixtureId != null) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  if (allFixtures.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Darkened backdrop behind cards */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.06)" }]} />

      {isFinishedGame && fixture ? (
        /* Single expanded card for finished games */
        <View style={styles.viewport}>
          <PeekCard
            fixture={fixture}
            index={0}
            currentIndex={0}
            cardHeight={SCREEN_HEIGHT}
            expandAmount={0}
            expandProgress={expandProgress}
            contentTop={CONTENT_TOP}
            cardBackground={theme.colors.cardBackground}
            currentIndexSV={currentIndexSV}
            translateY={translateY}
            prediction={getPrediction(fixture.id)}
            isSaved={isPredictionSaved(fixture.id)}
            onUpdatePrediction={updatePrediction}
            onUpdateSliderValue={updateSliderValue}
            isFinishedGame={true}
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
                  currentIndex={currentIndex}
                  cardHeight={CARD_HEIGHT}
                  expandAmount={PEEK + CARD_GAP}
                  expandProgress={expandProgress}
                  contentTop={CONTENT_TOP}
                  cardBackground={theme.colors.cardBackground}
                  currentIndexSV={currentIndexSV}
                  translateY={translateY}
                  prediction={getPrediction(f.id)}
                  isSaved={isPredictionSaved(f.id)}
                  onUpdatePrediction={updatePrediction}
                  onUpdateSliderValue={updateSliderValue}
                  isFinishedGame={false}
                />
              ))}
            </Animated.View>
          </GestureDetector>
        </View>
      )}

      {/* Fixed header — doesn't scroll with cards */}
      <View
        style={[
          styles.screenHeader,
          { paddingTop: insets.top },
        ]}
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
    </View>
  );
}

// ── Card with sliders, logos, scores, expand/collapse, and animated dark overlay ──

function PeekCard({
  fixture,
  index,
  currentIndex,
  cardHeight,
  expandAmount,
  expandProgress,
  contentTop,
  cardBackground,
  currentIndexSV,
  translateY,
  prediction,
  isSaved,
  onUpdatePrediction,
  onUpdateSliderValue,
  isFinishedGame,
}: {
  fixture: FixtureItem;
  index: number;
  currentIndex: number;
  cardHeight: number;
  expandAmount: number;
  expandProgress: Animated.SharedValue<number>;
  contentTop: number;
  cardBackground: string;
  currentIndexSV: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  prediction: GroupPrediction;
  isSaved: boolean;
  isFinishedGame: boolean;
  onUpdatePrediction: (
    fixtureId: number,
    type: "home" | "away",
    value: string
  ) => void;
  onUpdateSliderValue: (
    fixtureId: number,
    side: "home" | "away",
    val: number | null
  ) => void;
}) {
  const { theme } = useTheme();
  const isCurrent = currentIndex === index;
  const isNearby = Math.abs(currentIndex - index) <= 1;
  const isEditable = canPredict(fixture.state, fixture.startTs);

  const homeRef = useRef<TextInput>(null);
  const awayRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<"home" | "away" | null>(
    null
  );

  const handleSliderChange = useCallback(
    (side: "home" | "away", val: number | null) => {
      onUpdateSliderValue(fixture.id, side, val);
    },
    [fixture.id, onUpdateSliderValue]
  );

  const handleScoreChange = useCallback(
    (type: "home" | "away", text: string) => {
      onUpdatePrediction(fixture.id, type, text);
    },
    [fixture.id, onUpdatePrediction]
  );

  const handleFocus = useCallback((type: "home" | "away") => {
    setFocusedField(type);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const homeThumbColor = fixture.homeTeam?.firstKitColor ?? "#22C55E";
  const awayThumbColor = getAwaySliderColor(
    fixture.homeTeam?.firstKitColor,
    fixture.awayTeam?.secondKitColor,
    fixture.awayTeam?.thirdKitColor,
    "#3B82F6"
  );

  const STEP = cardHeight + CARD_GAP;
  const cardOpacityStyle = useAnimatedStyle(() => {
    const isCurrentAnim = currentIndexSV.value === index;
    const drag = Math.abs(translateY.value);

    if (isCurrentAnim) {
      // Current card: 1 → 0.25 gradually over the full swipe
      return {
        opacity: interpolate(
          drag,
          [0, STEP],
          [1, 0.25],
          "clamp"
        ),
      };
    }
    const isNextPeek =
      index === currentIndexSV.value + 1 && translateY.value < 0;
    const isPrevPeek =
      index === currentIndexSV.value - 1 && translateY.value > 0;
    if (isNextPeek || isPrevPeek) {
      // Peek card: 0.25 → 1 gradually over the full swipe
      return {
        opacity: interpolate(
          drag,
          [0, STEP],
          [0.25, 1],
          "clamp"
        ),
      };
    }
    return { opacity: 0.25 };
  });

  // Expand: card grows downward, negative margin keeps strip layout intact
  const expandStyle = useAnimatedStyle(() => ({
    height: cardHeight + expandProgress.value * expandAmount,
    marginBottom: CARD_GAP - expandProgress.value * expandAmount,
  }));

  const contentFadeOut = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.4], [1, 0], "clamp"),
  }));
  const contentFadeIn = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0.5, 1], [0, 1], "clamp"),
  }));

  const toggleExpand = useCallback(() => {
    if (!isCurrent || isFinishedGame) return;
    const target = expandProgress.value === 0 ? 1 : 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    expandProgress.value = withTiming(target, { duration: 300 });
  }, [isCurrent, isFinishedGame, expandProgress]);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: cardBackground },
        expandStyle,
        cardOpacityStyle,
      ]}
    >
      <Pressable
        style={[styles.cardInner, { paddingTop: contentTop }]}
        onPress={toggleExpand}
      >
        {isNearby ? (
          <>
          {/* Collapsed content — fades out on expand */}
          <Animated.View style={[styles.cardContentRow, contentFadeOut]}>
            {/* Home slider (left) */}
            <View
              style={styles.sliderContainer}
              pointerEvents={isCurrent ? "auto" : "none"}
            >
              <VerticalScoreSlider
                value={prediction.home}
                onValueChange={(val) => handleSliderChange("home", val)}
                thumbColor={homeThumbColor}
                side="right"
              />
            </View>

            {/* Center — same padding + centering as sliderContainer = auto-aligned */}
            <View style={styles.centerContent}>
              {/* Track-aligned zone — same 484px as slider */}
              <View style={styles.centerTrack}>
                {/* League info — floats above the track via absolute positioning */}
                <View style={styles.fixtureInfo}>
                  <AppText
                    variant="caption"
                    color="secondary"
                    style={styles.leagueText}
                    numberOfLines={1}
                  >
                    {[
                      fixture.league?.name,
                      fixture.round ? `Round ${fixture.round}` : null,
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </AppText>
                  {fixture.kickoffAt && (
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.kickoffText}
                      numberOfLines={1}
                    >
                      {formatKickoffDateTime(fixture.kickoffAt)}
                    </AppText>
                  )}
                </View>
                <View
                  style={styles.scoreCenter}
                  pointerEvents={isCurrent ? "auto" : "none"}
                >
                  <ScoresInput
                    prediction={prediction}
                    homeRef={homeRef}
                    awayRef={awayRef}
                    homeFocused={focusedField === "home"}
                    awayFocused={focusedField === "away"}
                    isSaved={isSaved}
                    isEditable={isEditable}
                    isLive={fixture.liveMinute != null}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={handleScoreChange}
                    onAutoNext={(type) => {
                      if (type === "home") {
                        awayRef.current?.focus();
                      }
                    }}
                    variant="large"
                    homeTeamLogo={fixture.homeTeam?.imagePath}
                    awayTeamLogo={fixture.awayTeam?.imagePath}
                    homeTeamName={fixture.homeTeam?.name}
                    awayTeamName={fixture.awayTeam?.name}
                  />
                </View>
              </View>
            </View>

            {/* Away slider (right) */}
            <View
              style={styles.sliderContainer}
              pointerEvents={isCurrent ? "auto" : "none"}
            >
              <VerticalScoreSlider
                value={prediction.away}
                onValueChange={(val) => handleSliderChange("away", val)}
                thumbColor={awayThumbColor}
                side="left"
              />
            </View>
          </Animated.View>
          {/* Expanded content — fades in on expand */}
          <Animated.View style={[styles.expandedContent, contentFadeIn]}>
            <AppText variant="body" style={styles.expandedTitle} numberOfLines={2}>
              {fixture.homeTeam?.name ?? "Home"}  vs  {fixture.awayTeam?.name ?? "Away"}
            </AppText>
          </Animated.View>
          </>
        ) : (
          // Lightweight placeholder for distant cards
          <View style={styles.placeholderContent}>
            <AppText variant="body" style={styles.teamName}>
              {fixture.homeTeam?.name ?? "Home"}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.vs}>
              vs
            </AppText>
            <AppText variant="body" style={styles.teamName}>
              {fixture.awayTeam?.name ?? "Away"}
            </AppText>
          </View>
        )}
      </Pressable>
    </Animated.View>
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
  card: {
    borderRadius: 32,
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
  },
  // Full card content layout
  cardContentRow: {
    flex: 1,
    flexDirection: "row",
  },
  sliderContainer: {
    width: 40,
    overflow: "visible",
    zIndex: 10,
    paddingTop: 48,
    paddingBottom: 12,
    justifyContent: "center",
    // backgroundColor: "rgba(0,128,255,0.15)", // DEBUG blue — sliders
  },
  centerContent: {
    flex: 1,
    // Same padding + centering as sliderContainer → auto-aligned
    paddingTop: 48,
    paddingBottom: 12,
    justifyContent: "center",
    // backgroundColor: "rgba(255,255,0,0.25)", // DEBUG yellow — padding areas
  },
  fixtureInfo: {
    position: "absolute",
    bottom: "100%", // sits right above centerTrack
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
    // backgroundColor: "rgba(255,255,0,0.35)", // DEBUG yellow — fixture info zone
  },
  centerTrack: {
    height: 484, // 11 × 44px — same as VerticalScoreSlider track
    position: "relative",
    // backgroundColor: "rgba(255,0,255,0.12)", // DEBUG magenta — aligned with slider track
  },
  leagueText: {
    fontSize: 12,
    textAlign: "center",
  },
  kickoffText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  scoreCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    marginTop: -260,
  },
  expandedContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  expandedTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  // Lightweight placeholder
  placeholderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "700",
  },
  vs: {
    fontSize: 14,
    fontWeight: "600",
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
    marginRight: 36, // balance the back button width
  },
});
