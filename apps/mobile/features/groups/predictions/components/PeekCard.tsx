import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { type GestureType } from "react-native-gesture-handler";
import { canPredict } from "@repo/utils";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { VerticalScoreSlider } from "./VerticalScoreSlider";
import { ScoresInput } from "./ScoresInput";
import { FixtureInfoHeader } from "./FixtureInfoHeader";
import { getTeamThumbColors } from "../utils/color-helpers";
import { CARD_GAP } from "../utils/peekCardLayout";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";

type PeekCardProps = {
  fixture: FixtureItem;
  index: number;
  cardHeight: number;
  expandAmount: number;
  contentTop: number;
  step: number;
  cardBackground: string;
  currentIndexSV: SharedValue<number>;
  translateY: SharedValue<number>;
  expandProgress: SharedValue<number>;
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
  /** Card responds to gestures/input */
  isInteractive: boolean;
  /** Show lightweight placeholder instead of full content */
  isNearby?: boolean;
  /** Finished game — no expand toggle */
  isFinishedGame?: boolean;
  /** Total number of cards in the group */
  totalCards: number;
  /** Ref to the pager gesture — passed to sliders so they can block it */
  pagerGestureRef?: React.MutableRefObject<GestureType | undefined>;
};

export const PeekCard = React.memo(function PeekCard({
  fixture,
  index,
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
  isInteractive,
  isNearby = true,
  isFinishedGame = false,
  totalCards,
  pagerGestureRef,
}: PeekCardProps) {
  const { theme } = useTheme();
  const isEditable = canPredict(fixture.state, fixture.startTs);

  const homeRef = useRef<TextInput>(null);
  const awayRef = useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<"home" | "away" | null>(null);
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

  const { homeThumbColor, awayThumbColor } = getTeamThumbColors(fixture);

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
    if (!isInteractive || isFinishedGame) return;
    const target = expandProgress.value === 0 ? 1 : 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    expandProgress.value = withTiming(target, { duration: 300 });
  }, [isInteractive, isFinishedGame, expandProgress]);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: cardBackground },
        expandStyle,
        cardOpacityStyle,
      ]}
    >
      <View
        style={[styles.cardInner, { paddingTop: contentTop }]}
      >
        {!isFinishedGame && isInteractive && (
          <Pressable
            onPress={toggleExpand}
            style={[styles.expandCollapseButton, { top: contentTop + 12 }]}
            hitSlop={12}
          >
            <Animated.View style={contentFadeOut} pointerEvents="none">
              <Ionicons name="expand-outline" size={20} color={theme.colors.textSecondary} />
            </Animated.View>
            <Animated.View style={[styles.expandCollapseOverlay, contentFadeIn]} pointerEvents="none">
              <Ionicons name="contract-outline" size={20} color={theme.colors.textSecondary} />
            </Animated.View>
          </Pressable>
        )}

        {isNearby ? (
          <>
            <Animated.View style={[styles.cardContentRow, contentFadeOut]}>
              <View
                style={styles.sliderContainerLeft}
                pointerEvents={isInteractive ? "auto" : "none"}
              >
                <VerticalScoreSlider
                  value={prediction.home}
                  onValueChange={(val) => handleSliderChange("home", val)}
                  thumbColor={homeThumbColor}
                  side="right"
                  pagerGestureRef={pagerGestureRef}
                />
              </View>

              <View style={styles.centerContent}>
                <View style={styles.aboveTrack}>
                  <FixtureInfoHeader
                    leagueName={fixture.league?.name}
                    round={fixture.round}
                    kickoffAt={fixture.kickoffAt}
                  />
                </View>
                <View style={styles.centerTrack}>
                  {fixture.homeTeam?.imagePath && (
                    <View style={styles.homeLogo}>
                      <TeamLogo
                        imagePath={fixture.homeTeam.imagePath}
                        teamName={fixture.homeTeam.name ?? ""}
                        size={88}
                        rounded={false}
                      />
                    </View>
                  )}
                  {fixture.awayTeam?.imagePath && (
                    <View style={styles.awayLogo}>
                      <TeamLogo
                        imagePath={fixture.awayTeam.imagePath}
                        teamName={fixture.awayTeam.name ?? ""}
                        size={88}
                        rounded={false}
                      />
                    </View>
                  )}
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
                <View style={styles.belowTrack}>
                  <AppText variant="caption" color="secondary">
                    {index + 1}/{totalCards}
                  </AppText>
                </View>
              </View>

              <View
                style={styles.sliderContainerRight}
                pointerEvents={isInteractive ? "auto" : "none"}
              >
                <VerticalScoreSlider
                  value={prediction.away}
                  onValueChange={(val) => handleSliderChange("away", val)}
                  thumbColor={awayThumbColor}
                  side="left"
                  pagerGestureRef={pagerGestureRef}
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
        ) : (
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
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
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
  sliderContainerLeft: {
    width: 66,
    marginRight: -26,
    overflow: "visible",
    zIndex: 10,
    paddingTop: 48,
    paddingBottom: 12,
    justifyContent: "center",
  },
  sliderContainerRight: {
    width: 66,
    marginLeft: -26,
    overflow: "visible",
    zIndex: 10,
    paddingTop: 48,
    paddingBottom: 12,
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    // backgroundColor: "rgba(255,0,0,0.35)", // DEBUG RED — center padding
  },
  aboveTrack: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  belowTrack: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 12,
  },
  centerTrack: {
    height: 484,
    position: "relative",
    // backgroundColor: "rgba(0,180,0,0.35)", // DEBUG GREEN — slider track zone
  },
  homeLogo: {
    position: "absolute",
    top: 40,
    left: 2,
    opacity: 0.5,
  },
  awayLogo: {
    position: "absolute",
    bottom: 26,
    right: 2,
    opacity: 0.5,
  },
  scoreCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    marginTop: 0,
    // backgroundColor: "rgba(255,140,0,0.4)", // DEBUG ORANGE — score input area
  },
  expandCollapseButton: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  expandCollapseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
});
