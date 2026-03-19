import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Dimensions, TextInput } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { AppText, TeamLogo } from "@/components/ui";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { useTheme, spacing, radius, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { ScoresInput } from "./ScoresInput";
import { OutcomePicker } from "./OutcomePicker";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import { isCancelled } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { PredictionMode } from "../types";
import { getOutcomeFromPrediction } from "../utils/utils";
import { formatKickoffDateTime } from "@/utils/fixture";
import { useMatchCardState } from "../hooks/useMatchCardState";
import { FIXTURE_STATE_MAP } from "../utils/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  homeRef: React.RefObject<TextInput | null> | undefined;
  awayRef: React.RefObject<TextInput | null> | undefined;
  homeFocused?: boolean;
  awayFocused?: boolean;
  isSaved?: boolean;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
  predictionMode?: PredictionMode;
  onSelectOutcome?: (outcome: "home" | "draw" | "away") => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

/**
 * Single game match card - designed specifically for single game view.
 * Horizontal layout: Team Logo + Name | Score | Name + Team Logo
 */
export function SingleGameMatchCard({
  fixture,
  prediction,
  homeRef,
  awayRef,
  homeFocused,
  awayFocused,
  isSaved = false,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
  predictionMode = "CorrectScore",
  onSelectOutcome,
  onSwipeLeft,
  onSwipeRight,
}: Props) {
  const { translateTeam } = useEntityTranslation();
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  const { isEditable, isLive, isFinished, gameResultOrTime } =
    useMatchCardState({
      fixture,
      positionInGroup: "single",
      currentFocusedField: null,
    });

  const cardStyles = useMemo(
    () => ({
      card: {
        backgroundColor: theme.colors.cardBackground,
        borderColor: theme.colors.border,
        borderBottomColor: theme.colors.textSecondary + "40",
      } as const,
    }),
    [theme]
  );

  // League + DateTime combined into a compact info line
  const leagueName = fixture.league?.name;
  const kickoffText = fixture.kickoffAt
    ? formatKickoffDateTime(fixture.kickoffAt)
    : null;
  const infoParts = [leagueName, kickoffText].filter(Boolean).join("  ·  ");

  // Swipe gesture handling (same pattern as LobbyPredictionsCTA)
  const translateX = useSharedValue(0);
  const swipeThreshold = SCREEN_WIDTH * 0.15;
  const cardWidth = SCREEN_WIDTH - 24; // matches marginHorizontal: 12 * 2
  const SLIDE_DURATION = 150;

  const canSwipeLeft = !!onSwipeLeft;
  const canSwipeRight = !!onSwipeRight;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
          if (!canSwipeRight && event.translationX > 0) {
            translateX.value = event.translationX * 0.3;
          } else if (!canSwipeLeft && event.translationX < 0) {
            translateX.value = event.translationX * 0.3;
          } else {
            translateX.value = event.translationX;
          }
        })
        .onEnd((event) => {
          const shouldGoNext = event.translationX < -swipeThreshold && canSwipeLeft;
          const shouldGoPrevious = event.translationX > swipeThreshold && canSwipeRight;

          if (shouldGoNext && onSwipeLeft) {
            translateX.value = withTiming(
              -cardWidth,
              { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) },
              () => {
                runOnJS(onSwipeLeft)();
                translateX.value = cardWidth;
                translateX.value = withTiming(0, {
                  duration: SLIDE_DURATION,
                  easing: Easing.out(Easing.ease),
                });
              }
            );
          } else if (shouldGoPrevious && onSwipeRight) {
            translateX.value = withTiming(
              cardWidth,
              { duration: SLIDE_DURATION, easing: Easing.in(Easing.ease) },
              () => {
                runOnJS(onSwipeRight)();
                translateX.value = -cardWidth;
                translateX.value = withTiming(0, {
                  duration: SLIDE_DURATION,
                  easing: Easing.out(Easing.ease),
                });
              }
            );
          } else {
            translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          }
        }),
    [canSwipeLeft, canSwipeRight, cardWidth, onSwipeLeft, onSwipeRight, translateX, swipeThreshold]
  );

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[!isEditable && !isLive && !isFinished && styles.dimmedContainer]}
    >
      <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          cardStyles.card,
          getShadowStyle("md"),
          swipeAnimatedStyle,
        ]}
      >

        {/* Live red tint overlay */}
        {isLive && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.live + "08" }]}
            pointerEvents="none"
          />
        )}

        {/* Info pill: League · DateTime */}
        {infoParts.length > 0 && (
          <View style={[styles.infoPill, { backgroundColor: theme.colors.surface }]}>
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {infoParts}
            </AppText>
          </View>
        )}

        {/* Main match content */}
        <View style={styles.matchContent}>
          {/* Home Team */}
          <View style={styles.teamSection}>
            <TeamLogo
              imagePath={fixture.homeTeam?.imagePath}
              teamName={homeTeamName}
              size={66}
              rounded={false}
            />
            <AppText
              variant="label"
              style={styles.teamName}
              numberOfLines={1}
            >
              {homeTeamName}
            </AppText>
          </View>

          {/* Score Section */}
          {predictionMode === "MatchWinner" && onSelectOutcome ? (
            <View style={styles.scoreSection}>
              <OutcomePicker
                selectedOutcome={getOutcomeFromPrediction(prediction)}
                isEditable={isEditable}
                onSelect={onSelectOutcome}
              />
            </View>
          ) : (
            <View style={styles.scoreSection}>
              <ScoresInput
                prediction={prediction}
                homeRef={homeRef}
                awayRef={awayRef}
                homeFocused={homeFocused}
                awayFocused={awayFocused}
                isSaved={isSaved}
                isEditable={isEditable}
                isLive={isLive}
                onFocus={onFocus}
                onBlur={onBlur}
                onChange={onChange}
                onAutoNext={onAutoNext}
                variant="large"
              />
              {isLive && (
                <AppText variant="caption" style={[styles.liveStatusText, { color: theme.colors.live }]}>
                  {FIXTURE_STATE_MAP[fixture.state] ?? "Live"}
                  {fixture.state !== "HT" && fixture.liveMinute != null ? ` - ${fixture.liveMinute}'` : ""}
                </AppText>
              )}
              {isCancelled(fixture.state) && (
                <AppText variant="caption" color="secondary" style={styles.specialStatusText}>
                  {FIXTURE_STATE_MAP[fixture.state] ?? fixture.state}
                </AppText>
              )}
            </View>
          )}

          {/* Away Team */}
          <View style={styles.teamSection}>
            <TeamLogo
              imagePath={fixture.awayTeam?.imagePath}
              teamName={awayTeamName}
              size={66}
              rounded={false}
            />
            <AppText
              variant="label"
              style={styles.teamName}
              numberOfLines={1}
            >
              {awayTeamName}
            </AppText>
          </View>
        </View>

      </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  dimmedContainer: {
    opacity: 0.6,
  },
  card: {
    marginHorizontal: spacing.ms,
    marginTop: spacing.ms,
    alignSelf: "stretch",
    paddingTop: spacing.ms,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.ml,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  liveTint: {},
  infoPill: {
    alignSelf: "center",
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.xs,
    borderRadius: spacing.ms,
    marginBottom: -radius.xs,
    zIndex: 1,
  },
  resultScore: {
    fontSize: 28,
    fontWeight: "700",
    writingDirection: "ltr",
  },
  liveStatusText: {
    fontWeight: "700",
    fontSize: 12,
  },
  specialStatusText: {
    fontWeight: "700",
    fontSize: 12,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
    gap: radius.sm,
    minWidth: 0,
    paddingHorizontal: spacing.xxs,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  scoreSection: {
    alignItems: "center",
    writingDirection: "ltr",
    paddingHorizontal: spacing.xs,
    flexShrink: 0,
    paddingTop: spacing.ms,
    gap: radius.xs,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: radius.xs,
    marginTop: spacing.ms,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.ms,
    borderRadius: radius.sm,
    alignSelf: "center",
  },
  resultRowHidden: {
    opacity: 0,
  },
  resultRowScore: {
    fontWeight: "700",
    fontSize: 13,
  },
});
