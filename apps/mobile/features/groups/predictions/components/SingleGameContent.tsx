import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TeamLogo, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { ScoresInput } from "./ScoresInput";
import { VerticalScoreSlider } from "./VerticalScoreSlider";
import { getAwaySliderColor } from "../utils/color-helpers";
import { formatKickoffDateTime } from "@/utils/fixture";
import { canPredict } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { PredictionMode } from "../types";

const DRAG_DISMISS_DISTANCE = 250;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export type SingleGameContentProps = {
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
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  /** Shared value written during vertical swipe — parent uses it to animate peek card */
  swipeProgress?: SharedValue<number>;
};

/**
 * V2 Single fixture prediction content:
 * - Card with vertical draggable sliders on sides, team logos in corners, ScoresInput center
 * - Tap center to expand card to full screen with crossfade
 * - Swipe down or press ‹ to collapse back
 */
export const SingleGameContent = React.memo(function SingleGameContent({
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
  onSwipeUp,
  onSwipeDown,
  onExpandChange,
  swipeProgress: swipeProgressProp,
}: SingleGameContentProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const isEditable = canPredict(fixture.state, fixture.startTs);
  const [isExpanded, setIsExpanded] = useState(false);

  const expandAnim = useSharedValue(0);
  const isExpandedSV = useSharedValue(0);
  const collapsedHeight = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const cardOffsetY = useSharedValue(0);

  const swipeY = useSharedValue(0);
  const enterAnim = useSharedValue(1);
  const enterDirectionSV = useSharedValue(1); // 1 = from below, -1 = from above

  // SharedValues for worklet-safe boundary checks
  const canSwipeUpSV = useSharedValue(onSwipeUp != null ? 1 : 0);
  const canSwipeDownSV = useSharedValue(onSwipeDown != null ? 1 : 0);
  canSwipeUpSV.value = onSwipeUp != null ? 1 : 0;
  canSwipeDownSV.value = onSwipeDown != null ? 1 : 0;

  // Stable refs for callbacks (read on JS thread only)
  const onExpandChangeRef = React.useRef(onExpandChange);
  onExpandChangeRef.current = onExpandChange;
  const onSwipeUpRef = React.useRef(onSwipeUp);
  onSwipeUpRef.current = onSwipeUp;
  const onSwipeDownRef = React.useRef(onSwipeDown);
  onSwipeDownRef.current = onSwipeDown;
  const callOnExpandChange = useCallback((expanded: boolean) => {
    onExpandChangeRef.current?.(expanded);
  }, []);

  const handleSliderChange = useCallback(
    (side: "home" | "away", val: number | null) => {
      if (onUpdateSliderValue) {
        onUpdateSliderValue(fixture.id, side, val);
      }
    },
    [fixture.id, onUpdateSliderValue]
  );

  const handleExpandCard = useCallback(() => {
    expandAnim.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    isExpandedSV.value = 1;
    setIsExpanded(true);
    callOnExpandChange(true);
  }, [expandAnim, isExpandedSV, callOnExpandChange]);

  const handleCollapseCard = useCallback(() => {
    expandAnim.value = withTiming(0, {
      duration: 250,
      easing: Easing.in(Easing.ease),
    });
    isExpandedSV.value = 0;
    setIsExpanded(false);
    callOnExpandChange(false);
  }, [expandAnim, isExpandedSV, callOnExpandChange]);

  const triggerEnterAnim = useCallback(() => {
    enterAnim.value = 0;
    enterAnim.value = withTiming(1, {
      duration: 350,
      easing: Easing.out(Easing.ease),
    });
  }, [enterAnim]);

  const callSwipeUp = useCallback(() => {
    const cb = onSwipeUpRef.current;
    swipeY.value = 0;
    if (swipeProgressProp) swipeProgressProp.value = 0;
    if (cb) {
      enterDirectionSV.value = 1;
      cb();
      triggerEnterAnim();
    }
  }, [swipeY, swipeProgressProp, enterDirectionSV, triggerEnterAnim]);

  const callSwipeDown = useCallback(() => {
    const cb = onSwipeDownRef.current;
    swipeY.value = 0;
    if (swipeProgressProp) swipeProgressProp.value = 0;
    if (cb) {
      enterDirectionSV.value = -1;
      cb();
      triggerEnterAnim();
    }
  }, [swipeY, swipeProgressProp, enterDirectionSV, triggerEnterAnim]);

  const SWIPE_Y_THRESHOLD = 30;

  const verticalPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-20, 20])
        .onUpdate((e) => {
          if (isExpandedSV.value === 1) {
            // Expanded: only allow swipe down to collapse
            if (e.translationY > 0) {
              expandAnim.value =
                1 - Math.min(e.translationY / DRAG_DISMISS_DISTANCE, 1);
            }
          } else {
            // Collapsed: track vertical swipe for game navigation
            swipeY.value = e.translationY;
            if (swipeProgressProp) {
              swipeProgressProp.value =
                e.translationY < 0
                  ? Math.min(-e.translationY / 200, 1)
                  : 0;
            }
          }
        })
        .onEnd((e) => {
          if (isExpandedSV.value === 1) {
            if (expandAnim.value < 0.5) {
              expandAnim.value = withTiming(0, {
                duration: 150,
                easing: Easing.in(Easing.ease),
              });
              isExpandedSV.value = 0;
              runOnJS(setIsExpanded)(false);
              runOnJS(callOnExpandChange)(false);
            } else {
              expandAnim.value = withTiming(1, {
                duration: 150,
                easing: Easing.out(Easing.ease),
              });
            }
          } else {
            const flingUp =
              (e.translationY < -SWIPE_Y_THRESHOLD || e.velocityY < -300) &&
              canSwipeUpSV.value === 1;
            const flingDown =
              (e.translationY > SWIPE_Y_THRESHOLD || e.velocityY > 300) &&
              canSwipeDownSV.value === 1;

            if (flingUp) {
              swipeY.value = withTiming(
                -SCREEN_HEIGHT * 0.5,
                { duration: 200, easing: Easing.in(Easing.ease) },
                () => runOnJS(callSwipeUp)()
              );
            } else if (flingDown) {
              swipeY.value = withTiming(
                SCREEN_HEIGHT * 0.5,
                { duration: 200, easing: Easing.in(Easing.ease) },
                () => runOnJS(callSwipeDown)()
              );
            } else {
              swipeY.value = withTiming(0, { duration: 200 });
              if (swipeProgressProp) {
                swipeProgressProp.value = withTiming(0, { duration: 200 });
              }
            }
          }
        }),
    [
      isExpandedSV,
      swipeY,
      expandAnim,
      canSwipeUpSV,
      canSwipeDownSV,
      callSwipeUp,
      callSwipeDown,
      callOnExpandChange,
      swipeProgressProp,
    ]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        if (isExpandedSV.value === 0) {
          runOnJS(handleExpandCard)();
        }
      }),
    [isExpandedSV, handleExpandCard]
  );

  const composedGesture = useMemo(
    () => Gesture.Exclusive(verticalPanGesture, tapGesture),
    [verticalPanGesture, tapGesture]
  );

  // ── Animation styles ──

  // Outer row: layout (height only)
  const cardRowAnimStyle = useAnimatedStyle(() => {
    const cH = collapsedHeight.value;
    const fH = containerHeight.value;
    return {
      ...(cH > 0 && fH > 0
        ? { height: interpolate(expandAnim.value, [0, 1], [cH, fH]) }
        : {}),
    };
  });

  // Inner card: visual (border, radius, vertical swipe offset + enter slide)
  const cardInnerAnimStyle = useAnimatedStyle(() => {
    const enterTranslateY = interpolate(
      enterAnim.value,
      [0, 1],
      [enterDirectionSV.value * 50, 0]
    );
    const enterOpacity = interpolate(
      enterAnim.value,
      [0, 0.15, 0.5, 1],
      [0, 0, 1, 1]
    );
    return {
      borderRadius: interpolate(expandAnim.value, [0, 1], [16, 0]),
      borderWidth: interpolate(expandAnim.value, [0, 1], [1, 0]),
      marginHorizontal: interpolate(expandAnim.value, [0, 1], [24, 0]),
      opacity: enterOpacity,
      transform: [{ translateY: swipeY.value + enterTranslateY }],
    };
  });

  const sliderAnimStyle = useAnimatedStyle(() => ({
    width: interpolate(expandAnim.value, [0, 0.3, 1], [40, 0, 0]),
    opacity: interpolate(expandAnim.value, [0, 0.3], [1, 0]),
  }));

  // Fade-through: collapsed fully out before expanded starts — no overlap
  const collapsedFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.3], [1, 0]),
    transform: [
      { scale: interpolate(expandAnim.value, [0, 0.3], [1, 0.95]) },
    ],
  }));

  const expandedFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0.35, 0.65], [0, 1]),
    transform: [
      { scale: interpolate(expandAnim.value, [0.35, 0.65], [1.03, 1]) },
    ],
  }));

  // ScoresInput in collapsed layer fades out earlier to avoid doubling
  const collapsedScoreFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 0.15], [1, 0]),
  }));

  // Moves the card to y=0 (top of screen) when expanded
  const cardWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          expandAnim.value,
          [0, 1],
          [0, -cardOffsetY.value]
        ),
      },
    ],
    zIndex: expandAnim.value > 0.01 ? 100 : 0,
  }));

  const homeThumbColor = fixture.homeTeam?.firstKitColor ?? "#22C55E";
  const awayThumbColor = getAwaySliderColor(
    fixture.homeTeam?.firstKitColor,
    fixture.awayTeam?.secondKitColor,
    fixture.awayTeam?.thirdKitColor,
    "#3B82F6"
  );

  return (
    <View
      style={styles.gameContainer}
      onLayout={(e) => {
        containerHeight.value = e.nativeEvent.layout.height;
      }}
    >
      {/* League + round / date — above card */}
      <Animated.View style={[styles.fixtureInfo, collapsedFadeStyle]} pointerEvents={isExpanded ? "none" : "auto"}>
        <AppText variant="caption" color="secondary" style={styles.fixtureInfoText} numberOfLines={1}>
          {[
            fixture.league?.name,
            fixture.round ? `Round ${fixture.round}` : null,
          ].filter(Boolean).join("  ·  ")}
        </AppText>
        {fixture.kickoffAt && (
          <AppText variant="caption" color="secondary" style={styles.fixtureInfoDate} numberOfLines={1}>
            {formatKickoffDateTime(fixture.kickoffAt)}
          </AppText>
        )}
      </Animated.View>

      <Animated.View
        style={cardWrapperStyle}
        onLayout={(e) => {
          cardOffsetY.value = e.nativeEvent.layout.y;
        }}
      >
          <Animated.View
            style={[styles.v2CardRow, cardRowAnimStyle]}
            onLayout={(e) => {
              if (expandAnim.value < 0.01) {
                collapsedHeight.value = e.nativeEvent.layout.height;
              }
            }}
          >
          {/* Card body */}
          <Animated.View
            style={[
              styles.v2Card,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
              cardInnerAnimStyle,
            ]}
          >
          {/* Home slider (left) — thumb pops outward */}
          <Animated.View
            style={[styles.sliderOuter, sliderAnimStyle]}
          >
            <VerticalScoreSlider
              value={prediction.home}
              onValueChange={(val) => handleSliderChange("home", val)}
              thumbColor={homeThumbColor}
              side="right"
            />
          </Animated.View>

          {/* Center content — tap to expand, swipe down to collapse */}
          <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={styles.v2Content}
          >
            {/* ── COLLAPSED LAYER: logos + score ── */}
            <Animated.View
              style={[StyleSheet.absoluteFill, collapsedFadeStyle]}
              pointerEvents={isExpanded ? "none" : "auto"}
            >
              <View style={styles.v2LogoTopLeft}>
                <TeamLogo
                  imagePath={fixture.homeTeam?.imagePath}
                  teamName={fixture.homeTeam?.name ?? ""}
                  size={56}
                  rounded={false}
                />
              </View>
              <View style={styles.v2LogoBottomRight}>
                <TeamLogo
                  imagePath={fixture.awayTeam?.imagePath}
                  teamName={fixture.awayTeam?.name ?? ""}
                  size={56}
                  rounded={false}
                />
              </View>
              <Animated.View style={[styles.v2ScoreCenter, collapsedScoreFadeStyle]}>
                <ScoresInput
                  prediction={prediction}
                  homeRef={homeRef}
                  awayRef={awayRef}
                  homeFocused={isHomeFocused}
                  awayFocused={isAwayFocused}
                  isSaved={isSaved}
                  isEditable={isEditable}
                  isLive={fixture.liveMinute != null}
                  onFocus={(type) => onFieldFocus(fixture.id, type)}
                  onBlur={() => onFieldBlur(fixture.id)}
                  onChange={(type, text) =>
                    onUpdatePrediction(fixture.id, type, text)
                  }
                  onAutoNext={(type) => {
                    const nextIndex = getNextFieldIndex(fixture.id, type);
                    if (nextIndex >= 0) {
                      navigateToField(nextIndex);
                    }
                  }}
                  variant="large"
                />
              </Animated.View>
            </Animated.View>

            {/* ── EXPANDED LAYER: full match screen ── */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.v2ExpandedLayer,
                expandedFadeStyle,
              ]}
              pointerEvents={isExpanded ? "auto" : "none"}
            >
              {/* League bar */}
              <View
                style={[
                  styles.exLeagueBar,
                  {
                    paddingTop: insets.top + 10,
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[styles.exLeagueText, { flex: 1 }]}
                  numberOfLines={1}
                >
                  {fixture.league?.name ?? ""}{" "}
                  {fixture.round ? `- Round ${fixture.round}` : ""}
                </AppText>
                <Pressable
                  onPress={handleCollapseCard}
                  hitSlop={12}
                  style={styles.exCollapseButton}
                >
                  <Ionicons
                    name="chevron-down"
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              </View>
              {/* Date */}
              <View
                style={[
                  styles.v2InfoPill,
                  {
                    backgroundColor: theme.colors.surface,
                    alignSelf: "center",
                    marginTop: 8,
                  },
                ]}
              >
                <AppText variant="caption" color="secondary" numberOfLines={1}>
                  {fixture.kickoffAt
                    ? formatKickoffDateTime(fixture.kickoffAt)
                    : ""}
                </AppText>
              </View>
              {/* Teams + Score */}
              <View style={styles.v2ExpandedMatchRow}>
                <View style={styles.v2ExpandedTeam}>
                  <TeamLogo
                    imagePath={fixture.homeTeam?.imagePath}
                    teamName={fixture.homeTeam?.name ?? ""}
                    size={72}
                    rounded={false}
                  />
                  <AppText
                    variant="label"
                    style={styles.v2ExpandedTeamName}
                    numberOfLines={2}
                  >
                    {fixture.homeTeam?.name ?? "Home"}
                  </AppText>
                </View>
                <View style={styles.v2ExpandedScore}>
                  <ScoresInput
                    prediction={prediction}
                    homeRef={homeRef}
                    awayRef={awayRef}
                    homeFocused={isHomeFocused}
                    awayFocused={isAwayFocused}
                    isSaved={isSaved}
                    isEditable={isEditable}
                    isLive={fixture.liveMinute != null}
                    onFocus={(type) => onFieldFocus(fixture.id, type)}
                    onBlur={() => onFieldBlur(fixture.id)}
                    onChange={(type, text) =>
                      onUpdatePrediction(fixture.id, type, text)
                    }
                    onAutoNext={(type) => {
                      const nextIndex = getNextFieldIndex(fixture.id, type);
                      if (nextIndex >= 0) {
                        navigateToField(nextIndex);
                      }
                    }}
                    variant="large"
                  />
                </View>
                <View style={styles.v2ExpandedTeam}>
                  <TeamLogo
                    imagePath={fixture.awayTeam?.imagePath}
                    teamName={fixture.awayTeam?.name ?? ""}
                    size={72}
                    rounded={false}
                  />
                  <AppText
                    variant="label"
                    style={styles.v2ExpandedTeamName}
                    numberOfLines={2}
                  >
                    {fixture.awayTeam?.name ?? "Away"}
                  </AppText>
                </View>
              </View>
              {/* Tabs */}
              <View style={[styles.exTabsRow, { borderBottomColor: theme.colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exTabsScroll}>
                  {["Summary", "Predict", "Predictions", "Lineups", "H2H", "Standings", "Odds"].map((tab, i) => (
                    <View key={tab} style={[styles.exTab, i === 0 && styles.exTabActive]}>
                      <AppText
                        variant="caption"
                        style={[
                          styles.exTabText,
                          { color: i === 0 ? theme.colors.primary : theme.colors.textSecondary },
                        ]}
                      >
                        {tab}
                      </AppText>
                      {i === 0 && <View style={[styles.exTabIndicator, { backgroundColor: theme.colors.primary }]} />}
                    </View>
                  ))}
                </ScrollView>
              </View>
              {/* Tab content placeholder */}
              <View style={styles.exTabContent}>
                <AppText variant="body" color="secondary">
                  Tab content here...
                </AppText>
              </View>
            </Animated.View>
          </Animated.View>
          </GestureDetector>

          {/* Away slider (right) — thumb pops outward */}
          <Animated.View
            style={[styles.sliderOuter, sliderAnimStyle]}
          >
            <VerticalScoreSlider
              value={prediction.away}
              onValueChange={(val) => handleSliderChange("away", val)}
              thumbColor={awayThumbColor}
              side="left"
            />
          </Animated.View>
          </Animated.View>
          </Animated.View>
      </Animated.View>

    </View>
  );
});

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    justifyContent: "center",
  },
  fixtureInfo: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  fixtureInfoText: {
    fontSize: 12,
    textAlign: "center",
  },
  fixtureInfoDate: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  teamNamesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  teamNameText: {
    fontSize: 16,
    fontWeight: "700",
  },
  v2CardRow: {
    flexDirection: "row",
    overflow: "visible",
    width: "100%",
  },
  v2Card: {
    flex: 1,
    flexDirection: "row",
    overflow: "visible",
  },
  sliderOuter: {
    overflow: "visible",
    zIndex: 10,
    paddingVertical: 12,
    justifyContent: "center",
  },
  v2Content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  v2LogoTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
  },
  v2LogoBottomRight: {
    position: "absolute",
    bottom: 8,
    right: 8,
    zIndex: 2,
  },
  v2ScoreCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  // ── Expanded layer ──
  v2ExpandedLayer: {
    justifyContent: "flex-start",
  },
  v2InfoPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  v2ExpandedMatchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  v2ExpandedTeam: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  v2ExpandedTeamName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  v2ExpandedScore: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  exLeagueBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  exCollapseButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  exLeagueText: {
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exTabsRow: {
    alignSelf: "stretch",
    borderBottomWidth: 1,
    marginTop: 8,
  },
  exTabsScroll: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
  },
  exTab: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  exTabActive: {},
  exTabText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  exTabIndicator: {
    height: 3,
    width: "60%",
    borderRadius: 2,
    marginTop: 6,
  },
  exTabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
});
