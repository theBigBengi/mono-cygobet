import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { canPredict } from "@repo/utils";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
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
      <Pressable
        style={[styles.cardInner, { paddingTop: contentTop }]}
        onPress={toggleExpand}
      >
        {isNearby ? (
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
                  <FixtureInfoHeader
                    leagueName={fixture.league?.name}
                    round={fixture.round}
                    kickoffAt={fixture.kickoffAt}
                  />
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
      </Pressable>
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
  centerTrack: {
    height: 484,
    position: "relative",
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
