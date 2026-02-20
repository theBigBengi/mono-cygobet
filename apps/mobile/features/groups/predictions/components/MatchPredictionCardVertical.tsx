import React, { useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { formatKickoffTime } from "@/utils/fixture";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import type { FocusedField, PredictionMode } from "../types";
import { useMatchCardState } from "../hooks/useMatchCardState";
import { getOutcomeFromPrediction } from "../utils/utils";
import { formatLiveDisplay } from "../utils/fixture-helpers";
import { TIMELINE } from "../utils/constants";
import { ScoreInput } from "./ScoreInput";
import { OutcomePicker } from "./OutcomePicker";
import { TeamRow } from "./TeamRow";
import { ResultDisplay } from "./ResultDisplay";

/** Cached viewport height — constant for the lifetime of the app. */
const VIEWPORT_H = Dimensions.get("window").height;

type InputRefs = {
  home: React.RefObject<TextInput | null>;
  away: React.RefObject<TextInput | null>;
};

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  inputRefs: React.MutableRefObject<Record<string, InputRefs>>;
  positionInGroup: PositionInGroup;
  currentFocusedField: FocusedField;
  /** When true, prediction is persisted (no pending unsaved change). */
  isSaved?: boolean;
  /** When true, card is highlighted (e.g., after scroll navigation). */
  isHighlighted?: boolean;
  cardRef?: React.RefObject<View | null> | undefined;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
  /** When "MatchWinner", shows 1/X/2 OutcomePicker instead of score inputs */
  predictionMode?: PredictionMode;
  onSelectOutcome?: (outcome: "home" | "draw" | "away") => void;
  /** If provided, called on card press instead of router.push to fixture detail. */
  onPressCard?: () => void;
  /** Hide the league info row (when it's rendered elsewhere). Default: true */
  showLeagueInfo?: boolean;
  /** Sequential match number for display (e.g., "1/12") */
  matchNumber?: string;
  /** Timeline: is this card in the filled (completed) zone? */
  timelineFilled?: boolean;
  /** Timeline: should the connector below this card be filled? */
  timelineConnectorFilled?: boolean;
  /** Timeline: first card in the list (no line above) */
  isFirstInTimeline?: boolean;
  /** Timeline: last card in the list (no line below) */
  isLastInTimeline?: boolean;
  /** When true, this is the next game to predict — gets a subtle primary glow */
  isNextToPredict?: boolean;
  /** Scroll position for reveal animation (content only, timeline stays visible) */
  scrollY?: SharedValue<number>;
};

/**
 * Vertical match card + score prediction inputs.
 * Teams are displayed vertically (home on top, away on bottom) with score inputs on the right side.
 * Includes a vertical timeline on the left that fills as games complete.
 */
export function MatchPredictionCardVertical({
  fixture,
  prediction,
  inputRefs,
  positionInGroup,
  currentFocusedField,
  isSaved: _isSaved,
  isHighlighted = false,
  cardRef,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
  predictionMode = "CorrectScore",
  onSelectOutcome,
  onPressCard: onPressCardProp,
  showLeagueInfo = true,
  matchNumber,
  timelineFilled = false,
  timelineConnectorFilled = false,
  isFirstInTimeline = false,
  isLastInTimeline = false,
  isNextToPredict = false,
  scrollY,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();
  const fixtureIdStr = String(fixture.id);

  // Scroll-reveal animation: content fades in when card scrolls into viewport
  const cardY = useSharedValue(-1);
  const revealed = useSharedValue(scrollY ? 0 : 1); // no scrollY → always visible

  const handleCardLayout = useCallback(
    (e: any) => {
      cardY.value = e.nativeEvent.layout.y;
    },
    [cardY]
  );

  useAnimatedReaction(
    () => {
      // Stop tracking once revealed
      if (revealed.value >= 1) return -1;
      if (!scrollY || cardY.value < 0) return -1;
      return scrollY.value + VIEWPORT_H - cardY.value;
    },
    (dist) => {
      if (dist === -1) return;
      if (dist > 60) {
        if (scrollY && scrollY.value < 50) {
          revealed.value = 1;
        } else {
          revealed.value = withSpring(1, {
            damping: 14,
            stiffness: 220,
            mass: 0.6,
          });
        }
      }
    }
  );

  const contentRevealStyle = useAnimatedStyle(() => ({
    opacity: revealed.value > 0 ? 1 : 0,
    transform: [
      { scale: interpolate(revealed.value, [0, 1], [0.8, 1]) },
    ],
  }));

  const onPressCard = useCallback(() => {
    if (onPressCardProp) {
      onPressCardProp();
    } else {
      router.push(`/fixtures/${fixture.id}` as any);
    }
  }, [onPressCardProp, router, fixture.id]);

  // Stable callbacks for ScoreInput — avoids creating new closures every render
  const handleHomeChange = useCallback((text: string) => onChange("home", text), [onChange]);
  const handleAwayChange = useCallback((text: string) => onChange("away", text), [onChange]);
  const handleHomeFocus = useCallback(() => onFocus("home"), [onFocus]);
  const handleAwayFocus = useCallback(() => onFocus("away"), [onFocus]);
  const handleHomeAutoNext = useCallback(() => onAutoNext?.("home"), [onAutoNext]);
  const handleAwayAutoNext = useCallback(() => onAutoNext?.("away"), [onAutoNext]);

  // Get or create refs for input fields
  if (!inputRefs.current[fixtureIdStr]) {
    inputRefs.current[fixtureIdStr] = {
      home: React.createRef(),
      away: React.createRef(),
    };
  }
  const homeRef = inputRefs.current[fixtureIdStr].home;
  const awayRef = inputRefs.current[fixtureIdStr].away;

  // Use hook to get all derived state
  const {
    isEditable,
    isLive,
    isFinished,
    isCancelled,
    gameResultOrTime,
    points,
    isHomeWinner,
    isAwayWinner,
    isHomeFocused,
    isAwayFocused,
    cardRadiusStyle,
    cardBorderStyle,
  } = useMatchCardState({
    fixture,
    positionInGroup,
    currentFocusedField,
  });

  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  // Card is actively being edited (any input focused)
  const isCardFocused = isHomeFocused || isAwayFocused;

  // Game status for side displays
  const fixturePoints = fixture.prediction?.points ?? 0;
  const hasPoints = fixturePoints > 0;
  const hasPrediction = prediction.home !== null && prediction.away !== null;

  // Colors
  const successColor = "#10B981"; // green
  const missedColor = "#EF4444"; // red

  // Prediction success based on points (for finished games)
  const predictionSuccess = isFinished ? hasPoints : undefined;

  // Timeline colors
  const filledColor = theme.colors.primary;
  const fillLeft = (TIMELINE.TRACK_WIDTH - TIMELINE.LINE_WIDTH) / 2;

  return (
    <View ref={cardRef} style={[styles.outerRow, !isLastInTimeline && styles.outerRowSpacing]} onLayout={handleCardLayout}>
      {/* ── Timeline column — track is rendered once in parent ── */}
      <View style={styles.timelineColumn}>
        {/* Fill (solid blue) — opaque, so -1px overlap is fine */}
        {timelineFilled && (
          <View
            style={{
              position: "absolute",
              left: fillLeft,
              width: TIMELINE.LINE_WIDTH,
              backgroundColor: filledColor,
              top: -21,
              bottom: isLastInTimeline || !timelineConnectorFilled ? "50%" : -21,
            }}
          />
        )}
        {isNextToPredict ? (
          /* "NEXT" badge with time — floats on the timeline */
          <View style={[styles.nextBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.nextBadgeText}>NEXT</Text>
            <Text style={styles.nextBadgeTime}>
              {formatKickoffTime(fixture.kickoffAt)}
            </Text>
          </View>
        ) : (
          <>
            {/* Waypoint dash */}
            <View
              style={[
                styles.waypointDash,
                { backgroundColor: theme.colors.textSecondary + "30" },
              ]}
            />
            {/* Text centered in the full gap (track → card) */}
            <View style={styles.timelineTextArea}>
              <Text style={[
                styles.timelineTime,
                (isLive || isCancelled) && styles.timelineLive,
                { color: isLive ? "#EF4444" : theme.colors.textSecondary + "90" },
              ]}>
                {isLive
                  ? formatLiveDisplay(fixture.state, fixture.liveMinute ?? null)
                  : isCancelled
                    ? fixture.state?.slice(0, 4).toUpperCase() ?? "CANC"
                    : formatKickoffTime(fixture.kickoffAt)}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* ── Content column ── */}
      <Animated.View style={[styles.contentColumn, contentRevealStyle]}>
        {/* League info row */}
        {showLeagueInfo && (
          <View style={styles.leagueInfoRow}>
            <View style={styles.leagueInfoLeft}>
              <Text
                style={[styles.leagueText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {fixture.league?.name}
              </Text>
              {fixture.round && (
                <>
                  <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>•</Text>
                  <Text style={[styles.leagueText, { color: theme.colors.textSecondary }]}>
                    R{fixture.round}
                  </Text>
                </>
              )}
            </View>
            <Text style={[styles.leagueText, { color: theme.colors.textSecondary }]}>
              {formatKickoffTime(fixture.kickoffAt)}
            </Text>
            {/* Spacer to align with points column */}
            <View style={styles.rightAlignSpacer} />
          </View>
        )}

        {/* Card + points row */}
        <View style={styles.cardContentRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPressCard();
            }}
            style={({ pressed }) => [
              styles.cardShadowWrapper,
              isFinished && !isCancelled && !pressed && {
                shadowColor: hasPoints ? successColor : missedColor,
                shadowOpacity: 0.2,
              },
              isCardFocused && !pressed && {
                shadowColor: theme.colors.primary,
                shadowOpacity: 0.25,
                shadowRadius: 12,
              },
              pressed && styles.cardShadowWrapperPressed,
            ]}
          >
            <Card
              style={[
                styles.matchCard,
                {
                  backgroundColor: isHighlighted
                    ? theme.colors.primary + "15"
                    : isCardFocused
                      ? theme.colors.primary + "08"
                      : theme.colors.cardBackground,
                  borderColor: isCardFocused
                    ? theme.colors.primary + "40"
                    : theme.colors.border,
                  borderBottomColor: isCardFocused
                    ? theme.colors.primary + "60"
                    : theme.colors.textSecondary + "40",
                },
                isFinished && !isCancelled && {
                  borderColor: (hasPoints ? successColor : missedColor) + "30",
                  borderBottomColor: (hasPoints ? successColor : missedColor) + "50",
                },
              ]}
            >
            <View
              style={[
                styles.matchContent,
                isCancelled && { opacity: 0.6 },
              ]}
            >
              {/* Home Row */}
              <View style={styles.teamRow}>
                <View style={styles.teamPressable}>
                  <TeamRow
                    team={fixture.homeTeam}
                    teamName={homeTeamName}
                    isWinner={isHomeWinner}
                  />
                </View>
                <ResultDisplay
                  result={gameResultOrTime}
                  isLive={isLive}
                  isFinished={isFinished}
                  isCancelled={isCancelled}
                  isHomeWinner={isHomeWinner}
                  isAwayWinner={isAwayWinner}
                  type="home"
                />
                {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                  <ScoreInput
                    type="home"
                    value={prediction.home}
                    isFocused={isHomeFocused}
                    isEditable={isEditable}
                    isFinished={isFinished}
                    inputRef={homeRef}
                    onChange={handleHomeChange}
                    onFocus={handleHomeFocus}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? handleHomeAutoNext : undefined}
                    isCorrect={predictionSuccess}
                  />
                )}
              </View>

              {/* Away Row */}
              <View style={styles.teamRow}>
                <View style={styles.teamPressable}>
                  <TeamRow
                    team={fixture.awayTeam}
                    teamName={awayTeamName}
                    isWinner={isAwayWinner}
                  />
                </View>
                <ResultDisplay
                  result={gameResultOrTime}
                  isLive={isLive}
                  isFinished={isFinished}
                  isCancelled={isCancelled}
                  isHomeWinner={isHomeWinner}
                  isAwayWinner={isAwayWinner}
                  type="away"
                />
                {predictionMode === "MatchWinner" && onSelectOutcome ? null : (
                  <ScoreInput
                    type="away"
                    value={prediction.away}
                    isFocused={isAwayFocused}
                    isEditable={isEditable}
                    isFinished={isFinished}
                    inputRef={awayRef}
                    onChange={handleAwayChange}
                    onFocus={handleAwayFocus}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? handleAwayAutoNext : undefined}
                    isCorrect={predictionSuccess}
                  />
                )}
              </View>

              {/* OutcomePicker for MatchWinner mode */}
              {predictionMode === "MatchWinner" && onSelectOutcome && (
                <OutcomePicker
                  selectedOutcome={getOutcomeFromPrediction(prediction)}
                  isEditable={isEditable}
                  onSelect={onSelectOutcome}
                />
              )}
            </View>
          </Card>
          </Pressable>
          {/* Right side: points for finished games, empty otherwise */}
          {isFinished && !isCancelled ? (
            <Pressable onPress={onPressCard} style={styles.pointsContainer}>
              <Text style={[styles.pointsNumber, { color: hasPoints ? successColor : missedColor }]}>
                {hasPoints ? `+${fixturePoints}` : "0"}
              </Text>
              <Text style={[styles.pointsLabel, { color: theme.colors.textSecondary }]}>
                pts
              </Text>
            </Pressable>
          ) : (
            <View style={styles.rightSpacer} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Layout ── */
  outerRow: {
    flexDirection: "row",
  },
  outerRowSpacing: {
    marginBottom: 20,
  },
  timelineColumn: {
    width: TIMELINE.COLUMN_WIDTH,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  waypointDash: {
    width: TIMELINE.TRACK_WIDTH + 2,
    height: 2,
    borderRadius: 1,
    zIndex: 2,
  },
  timelineTextArea: {
    position: "absolute",
    left: TIMELINE.TRACK_WIDTH,
    right: -10, // extend into contentColumn paddingLeft
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  timelineLive: {
    fontWeight: "800",
  },
  nextBadge: {
    position: "absolute",
    left: 2,
    top: "50%",
    marginTop: -18,
    zIndex: 3,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignItems: "center",
    // 3D floating effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  nextBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  nextBadgeTime: {
    fontSize: 8,
    fontWeight: "600",
    color: "#ffffffCC",
    marginTop: 1,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 10,
  },

  /* ── League info ── */
  leagueInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  leagueInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  leagueText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  separator: {
    fontSize: 11,
    opacity: 0.4,
  },
  rightAlignSpacer: {
    width: TIMELINE.COLUMN_WIDTH,
  },

  /* ── Card + points row ── */
  cardContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardShadowWrapper: {
    flex: 1,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardShadowWrapperPressed: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    transform: [{ scale: 0.98 }, { translateY: 2 }],
  },
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  matchContent: {
    flexDirection: "column",
    gap: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamPressable: {
    flex: 1,
  },

  /* ── Points / right side ── */
  pointsContainer: {
    width: TIMELINE.COLUMN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsNumber: {
    fontSize: 24,
    fontWeight: "800",
  },
  pointsLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  rightSpacer: {
    width: TIMELINE.COLUMN_WIDTH,
  },
});
