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
const SCREEN_WIDTH = Dimensions.get("window").width;

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
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onExpandChange?: (expanded: boolean) => void;
  /** Total number of fixtures — shows stacked cards behind when > 1 */
  totalFixtures?: number;
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
  onSwipeLeft,
  onSwipeRight,
  onExpandChange,
  totalFixtures = 1,
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

  const swipeX = useSharedValue(0);

  // Stable refs for callbacks to use in worklets
  const onExpandChangeRef = React.useRef(onExpandChange);
  onExpandChangeRef.current = onExpandChange;
  const onSwipeLeftRef = React.useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;
  const onSwipeRightRef = React.useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;
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

  const swipeDownGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([0, 15])
        .onUpdate((e) => {
          if (isExpandedSV.value === 0) return;
          if (e.translationY > 0) {
            expandAnim.value =
              1 - Math.min(e.translationY / DRAG_DISMISS_DISTANCE, 1);
          }
        })
        .onEnd(() => {
          if (isExpandedSV.value === 0) return;
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
        }),
    [expandAnim, isExpandedSV, callOnExpandChange]
  );

  const callSwipeLeft = useCallback(() => {
    onSwipeLeftRef.current?.();
    swipeX.value = 0;
  }, [swipeX]);
  const callSwipeRight = useCallback(() => {
    onSwipeRightRef.current?.();
    swipeX.value = 0;
  }, [swipeX]);

  const SWIPE_THRESHOLD = 50;

  const swipeHorizontalGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-30, 30])
        .onUpdate((e) => {
          if (isExpandedSV.value === 1) return;
          swipeX.value = e.translationX;
        })
        .onEnd((e) => {
          if (isExpandedSV.value === 1) return;
          const flingLeft = (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -500) && onSwipeLeftRef.current;
          const flingRight = (e.translationX > SWIPE_THRESHOLD || e.velocityX > 500) && onSwipeRightRef.current;
          // Fling left → next game
          if (flingLeft) {
            swipeX.value = withTiming(
              -SCREEN_WIDTH,
              { duration: 200, easing: Easing.in(Easing.ease) },
              () => runOnJS(callSwipeLeft)()
            );
          // Fling right → previous game
          } else if (flingRight) {
            swipeX.value = withTiming(
              SCREEN_WIDTH,
              { duration: 200, easing: Easing.in(Easing.ease) },
              () => runOnJS(callSwipeRight)()
            );
          // Didn't pass threshold — snap back
          } else {
            swipeX.value = withTiming(0, { duration: 200 });
          }
        }),
    [isExpandedSV, swipeX, callSwipeLeft, callSwipeRight]
  );

  const composedGesture = useMemo(
    () => Gesture.Race(swipeDownGesture, swipeHorizontalGesture),
    [swipeDownGesture, swipeHorizontalGesture]
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

  // Inner card: visual (border, radius, gap from sliders, swipe offset)
  const cardInnerAnimStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(expandAnim.value, [0, 1], [16, 0]),
    borderWidth: interpolate(expandAnim.value, [0, 1], [1, 0]),
    marginHorizontal: interpolate(expandAnim.value, [0, 1], [8, 0]),
    transform: [{ translateX: swipeX.value }],
  }));

  const sliderAnimStyle = useAnimatedStyle(() => ({
    width: interpolate(expandAnim.value, [0, 1], [52, 0]),
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

      {/* Team names — home top-left, away top-right */}
      <Animated.View style={[styles.teamNamesRow, collapsedFadeStyle]} pointerEvents={isExpanded ? "none" : "auto"}>
        <AppText variant="body" style={[styles.teamNameText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {fixture.homeTeam?.name ?? "Home"}
        </AppText>
        <AppText variant="body" style={[styles.teamNameText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {fixture.awayTeam?.name ?? "Away"}
        </AppText>
      </Animated.View>

      <Animated.View
        style={cardWrapperStyle}
        onLayout={(e) => {
          cardOffsetY.value = e.nativeEvent.layout.y;
        }}
      >
        {/* Stacked cards behind — peek below the main card */}
        {totalFixtures > 1 && (
          <Animated.View style={[styles.stackContainer, collapsedFadeStyle]} pointerEvents="none">
            {totalFixtures > 2 && (
              <View
                style={[
                  styles.stackCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.border,
                    top: 8,
                    bottom: -8,
                    left: 68,
                    right: 68,
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.stackCard,
                {
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.border,
                  top: 4,
                  bottom: -4,
                  left: 64,
                  right: 64,
                },
              ]}
            />
          </Animated.View>
        )}
          <Animated.View
            style={[styles.v2CardRow, cardRowAnimStyle]}
            onLayout={(e) => {
              if (!isExpanded && collapsedHeight.value === 0) {
                collapsedHeight.value = e.nativeEvent.layout.height;
              }
            }}
          >
          {/* Home slider (left) — outside card for thumb overflow */}
          <Animated.View
            style={[styles.sliderOuter, sliderAnimStyle]}
          >
            <VerticalScoreSlider
              value={prediction.home}
              onValueChange={(val) => handleSliderChange("home", val)}
              thumbColor={homeThumbColor}
              side="left"
            />
          </Animated.View>

          {/* Card body — has border radius + overflow hidden */}
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
          {/* Center content — tap to expand, swipe down to collapse */}
          <GestureDetector gesture={composedGesture}>
          <Pressable
            style={styles.v2Content}
            onPress={isExpanded ? undefined : handleExpandCard}
            disabled={isExpanded}
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
          </Pressable>
          </GestureDetector>
          </Animated.View>

          {/* Away slider (right) — outside card for thumb overflow */}
          <Animated.View
            style={[styles.sliderOuter, sliderAnimStyle]}
          >
            <VerticalScoreSlider
              value={prediction.away}
              onValueChange={(val) => handleSliderChange("away", val)}
              thumbColor={awayThumbColor}
              side="right"
            />
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
  stackContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  stackCard: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: 1,
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
    overflow: "hidden",
  },
  sliderOuter: {
    overflow: "visible",
    zIndex: 10,
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
