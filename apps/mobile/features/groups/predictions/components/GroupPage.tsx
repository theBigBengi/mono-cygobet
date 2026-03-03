import React, {
  useState,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { canPredict } from "@repo/utils";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useGroupQuery } from "@/domains/groups";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { VerticalScoreSlider } from "./VerticalScoreSlider";
import { ScoresInput } from "./ScoresInput";
import { getAwaySliderColor } from "../utils/color-helpers";
import { formatKickoffDateTime } from "@/utils/fixture";
import type { PredictionMode } from "../types";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const CARD_GAP = 12;
const PEEK = 48;

export type GroupPageRef = {
  saveAllPending: () => Promise<void>;
};

type GroupPageProps = {
  groupId: number;
  predictionMode: PredictionMode;
  isCurrent: boolean;
  headerHeight: number;
};

export const GroupPage = forwardRef<GroupPageRef, GroupPageProps>(
  function GroupPage({ groupId, predictionMode, isCurrent, headerHeight }, ref) {
    const { theme } = useTheme();
    const { t } = useTranslation("common");

    const { data: groupData, isLoading: isGroupLoading } = useGroupQuery(
      groupId,
      { includeFixtures: true }
    );
    const fixtures = useMemo<FixtureItem[]>(() => {
      const list = groupData?.data?.fixtures;
      return Array.isArray(list) ? (list as FixtureItem[]) : [];
    }, [groupData?.data?.fixtures]);

    const predictableFixtures = useMemo(
      () => fixtures.filter((f) => canPredict(f.state, f.startTs)),
      [fixtures]
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

    useImperativeHandle(
      ref,
      () => ({
        saveAllPending: () => saveAllPendingRef.current(),
      }),
      []
    );

    const savePending = useCallback(() => {
      saveAllPendingRef.current();
    }, []);

    // Stable callbacks — identity never changes
    const updatePredictionRef = useRef(updatePrediction);
    updatePredictionRef.current = updatePrediction;
    const updateSliderValueRef = useRef(updateSliderValue);
    updateSliderValueRef.current = updateSliderValue;

    const stableUpdatePrediction = useCallback(
      (fixtureId: number, type: "home" | "away", value: string) => {
        updatePredictionRef.current(fixtureId, type, value);
      },
      []
    );
    const stableUpdateSliderValue = useCallback(
      (fixtureId: number, side: "home" | "away", val: number | null) => {
        updateSliderValueRef.current(fixtureId, side, val);
      },
      []
    );

    const CONTENT_TOP = headerHeight;
    const CARD_HEIGHT = SCREEN_HEIGHT - PEEK - CARD_GAP;
    const STEP = CARD_HEIGHT + CARD_GAP;
    const EXPAND_AMOUNT = PEEK + CARD_GAP;
    const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.65;

    const [currentIndex, setCurrentIndex] = useState(0);
    const currentIndexSV = useSharedValue(0);
    const translateY = useSharedValue(0);
    const expandProgress = useSharedValue(0);

    const totalCards = predictableFixtures.length;

    const onIndexChange = useCallback((index: number) => {
      setCurrentIndex(index);
    }, []);

    const panGesture = Gesture.Pan()
      .activeOffsetY([-10, 10])
      .failOffsetX([-20, 20])
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

    if (isGroupLoading || fixtures.length === 0) {
      return (
        <View
          style={[
            styles.pageContainer,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (predictableFixtures.length === 0) {
      return (
        <View
          style={[
            styles.pageContainer,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <AppText variant="body" color="secondary">
            {t("groups.noGroupsInFilter")}
          </AppText>
        </View>
      );
    }

    return (
      <View
        style={styles.pageContainer}
        pointerEvents={isCurrent ? "auto" : "none"}
      >
        <View style={StyleSheet.absoluteFill}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={stripStyle}>
              {predictableFixtures.map((f, i) => {
                const isNearby = Math.abs(currentIndex - i) <= 1;
                if (!isNearby) {
                  return (
                    <View
                      key={f.id}
                      style={{
                        height: CARD_HEIGHT,
                        marginBottom: CARD_GAP,
                      }}
                    />
                  );
                }

                return (
                  <PeekCard
                    key={f.id}
                    fixture={f}
                    index={i}
                    isCurrentCard={currentIndex === i}
                    cardHeight={CARD_HEIGHT}
                    expandAmount={EXPAND_AMOUNT}
                    contentTop={CONTENT_TOP}
                    step={STEP}
                    cardBackground={theme.colors.cardBackground}
                    currentIndexSV={currentIndexSV}
                    translateY={translateY}
                    expandProgress={expandProgress}
                    prediction={getPrediction(f.id)}
                    isSaved={isPredictionSaved(f.id)}
                    onUpdatePrediction={stableUpdatePrediction}
                    onUpdateSliderValue={stableUpdateSliderValue}
                    isGroupCurrent={isCurrent}
                  />
                );
              })}
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    );
  }
);

// ── PeekCard ──

const PeekCard = React.memo(function PeekCard({
  fixture,
  index,
  isCurrentCard,
  cardHeight,
  expandAmount,
  contentTop,
  step,
  cardBackground,
  currentIndexSV,
  translateY,
  expandProgress,
  prediction,
  isSaved,
  onUpdatePrediction,
  onUpdateSliderValue,
  isGroupCurrent,
}: {
  fixture: FixtureItem;
  index: number;
  isCurrentCard: boolean;
  cardHeight: number;
  expandAmount: number;
  contentTop: number;
  step: number;
  cardBackground: string;
  currentIndexSV: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  expandProgress: Animated.SharedValue<number>;
  prediction: GroupPrediction;
  isSaved: boolean;
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
  isGroupCurrent: boolean;
}) {
  const { theme } = useTheme();
  const isEditable = canPredict(fixture.state, fixture.startTs);
  const isInteractive = isGroupCurrent && isCurrentCard;

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

  const handleAutoNext = useCallback((type: "home" | "away") => {
    if (type === "home") {
      awayRef.current?.focus();
    }
  }, []);

  const homeThumbColor = fixture.homeTeam?.firstKitColor ?? "#22C55E";
  const awayThumbColor = getAwaySliderColor(
    fixture.homeTeam?.firstKitColor,
    fixture.awayTeam?.secondKitColor,
    fixture.awayTeam?.thirdKitColor,
    "#3B82F6"
  );

  const cardOpacityStyle = useAnimatedStyle(() => {
    const isCurrentAnim = currentIndexSV.value === index;
    const drag = Math.abs(translateY.value);

    if (isCurrentAnim) {
      return {
        opacity: interpolate(drag, [0, step], [1, 0.25], "clamp"),
      };
    }
    const isNextPeek =
      index === currentIndexSV.value + 1 && translateY.value < 0;
    const isPrevPeek =
      index === currentIndexSV.value - 1 && translateY.value > 0;
    if (isNextPeek || isPrevPeek) {
      return {
        opacity: interpolate(drag, [0, step], [0.25, 1], "clamp"),
      };
    }
    return { opacity: 0.25 };
  });

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
    if (!isCurrentCard || !isGroupCurrent) return;
    const target = expandProgress.value === 0 ? 1 : 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    expandProgress.value = withTiming(target, { duration: 300 });
  }, [isCurrentCard, isGroupCurrent, expandProgress]);

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
        <>
          <Animated.View style={[styles.cardContentRow, contentFadeOut]}>
            <View
              style={styles.sliderContainer}
              pointerEvents={isInteractive ? "auto" : "none"}
            >
              <VerticalScoreSlider
                value={prediction.home}
                onValueChange={(val) => handleSliderChange("home", val)}
                thumbColor={homeThumbColor}
                side="right"
              />
            </View>

            <View style={styles.centerContent}>
              <View style={styles.centerTrack}>
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
                  pointerEvents={isInteractive ? "auto" : "none"}
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
                    onAutoNext={handleAutoNext}
                    variant="large"
                    homeTeamLogo={fixture.homeTeam?.imagePath}
                    awayTeamLogo={fixture.awayTeam?.imagePath}
                    homeTeamName={fixture.homeTeam?.name}
                    awayTeamName={fixture.awayTeam?.name}
                  />
                </View>
              </View>
            </View>

            <View
              style={styles.sliderContainer}
              pointerEvents={isInteractive ? "auto" : "none"}
            >
              <VerticalScoreSlider
                value={prediction.away}
                onValueChange={(val) => handleSliderChange("away", val)}
                thumbColor={awayThumbColor}
                side="left"
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.expandedContent, contentFadeIn]}>
            <AppText
              variant="body"
              style={styles.expandedTitle}
              numberOfLines={2}
            >
              {fixture.homeTeam?.name ?? "Home"}  vs  {fixture.awayTeam?.name ?? "Away"}
            </AppText>
          </Animated.View>
        </>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  card: {
    borderRadius: 32,
    overflow: "hidden",
  },
  cardInner: {
    flex: 1,
  },
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
  },
  centerContent: {
    flex: 1,
    paddingTop: 48,
    paddingBottom: 12,
    justifyContent: "center",
  },
  fixtureInfo: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  centerTrack: {
    height: 484,
    position: "relative",
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
});
