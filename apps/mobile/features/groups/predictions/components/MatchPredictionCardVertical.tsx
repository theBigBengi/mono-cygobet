import React from "react";
import { View, StyleSheet, TextInput, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { formatKickoffTime, formatKickoffDate } from "@/utils/fixture";
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
import { ScoreInput } from "./ScoreInput";
import { OutcomePicker } from "./OutcomePicker";
import { TeamRow } from "./TeamRow";
import { ResultDisplay } from "./ResultDisplay";

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
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();
  const fixtureIdStr = String(fixture.id);
  const [isCardPressed, setIsCardPressed] = React.useState(false);

  const onPressCard = () => {
    if (onPressCardProp) {
      onPressCardProp();
    } else {
      router.push(`/fixtures/${fixture.id}` as any);
    }
  };

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

  // Game status for side displays
  const fixturePoints = fixture.prediction?.points ?? 0;
  const hasPoints = fixturePoints > 0;
  const hasPrediction = prediction.home !== null && prediction.away !== null;

  // Colors
  const successColor = "#10B981"; // green
  const missedColor = "#EF4444"; // red

  // Prediction success based on points (for finished games)
  const predictionSuccess = isFinished ? hasPoints : undefined;

  // Timeline line colors
  const trackColor = theme.colors.border;
  const filledColor = theme.colors.primary;
  const topLineColor = isFirstInTimeline ? "transparent" : timelineFilled ? filledColor : trackColor;
  const bottomLineColor = isLastInTimeline ? "transparent" : timelineConnectorFilled ? filledColor : trackColor;

  return (
    <View ref={cardRef} style={styles.outerRow}>
      {/* ── Timeline column ── */}
      <View style={styles.timelineColumn}>
        {/* Line above waypoint */}
        <View style={[styles.timelineLine, { backgroundColor: topLineColor }]} />
        {/* Waypoint node */}
        <View
          style={[
            styles.waypointNode,
            {
              backgroundColor: timelineFilled
                ? filledColor + "18"
                : theme.colors.background,
              borderColor: timelineFilled
                ? filledColor + "60"
                : trackColor,
            },
          ]}
        >
          <Text
            style={[
              styles.waypointText,
              {
                color: timelineFilled
                  ? filledColor
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {matchNumber || ""}
          </Text>
        </View>
        {/* Line below waypoint */}
        <View style={[styles.timelineLine, { backgroundColor: bottomLineColor }]} />
      </View>

      {/* ── Content column ── */}
      <View style={[styles.contentColumn, isLastInTimeline && { paddingBottom: 0 }]}>
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
              {formatKickoffDate(fixture.kickoffAt)} {formatKickoffTime(fixture.kickoffAt)}
            </Text>
            {/* Spacer to align with points column */}
            <View style={styles.rightAlignSpacer} />
          </View>
        )}

        {/* Card + points row */}
        <View style={styles.cardContentRow}>
          <View
            style={[
              styles.cardShadowWrapper,
              isFinished && !isCancelled && !isCardPressed && {
                shadowColor: hasPoints ? successColor : missedColor,
                shadowOpacity: 0.2,
              },
              isCardPressed && styles.cardShadowWrapperPressed,
            ]}
          >
            <Card
              style={[
                styles.matchCard,
                {
                  backgroundColor: isHighlighted ? theme.colors.primary + "15" : theme.colors.cardBackground,
                  borderColor: theme.colors.border,
                  borderBottomColor: theme.colors.textSecondary + "40",
                },
                isFinished && !isCancelled && {
                  borderColor: (hasPoints ? successColor : missedColor) + "30",
                  borderBottomColor: (hasPoints ? successColor : missedColor) + "50",
                },
              ]}
            >
            <Pressable
              onPress={onPressCard}
              onPressIn={() => {
                setIsCardPressed(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => setIsCardPressed(false)}
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
                    onChange={(text) => onChange("home", text)}
                    onFocus={() => onFocus("home")}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? () => onAutoNext("home") : undefined}
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
                    onChange={(text) => onChange("away", text)}
                    onFocus={() => onFocus("away")}
                    onBlur={onBlur}
                    onAutoNext={onAutoNext ? () => onAutoNext("away") : undefined}
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
            </Pressable>
          </Card>
          </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Layout ── */
  outerRow: {
    flexDirection: "row",
  },
  timelineColumn: {
    width: 36,
    alignItems: "center",
    alignSelf: "stretch",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    borderRadius: 1,
  },
  waypointNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  waypointText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  contentColumn: {
    flex: 1,
    paddingBottom: 20,
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
    width: 36,
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
    width: 36,
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
    width: 36,
  },
});
