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
};

/**
 * Vertical match card + score prediction inputs.
 * Teams are displayed vertically (home on top, away on bottom) with score inputs on the right side.
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

  return (
    <View ref={cardRef} style={styles.outerWrapper}>
      {/* League info row - centered like the card */}
      {showLeagueInfo && (
        <View style={styles.leagueInfoWrapper}>
          {/* Left spacer to match side width */}
          <View style={styles.leftSpacer} />
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
          </View>
          {/* Right spacer to match side width */}
          <View style={styles.chevronSpacer} />
        </View>
      )}

      {/* Card row: match number + card + points */}
      <View style={styles.cardRow}>
        {/* Left side: match number */}
        <View style={styles.statusContainer}>
          <Text style={[styles.matchNumber, { color: theme.colors.textSecondary }]}>
            {matchNumber || ""}
          </Text>
        </View>
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
              { backgroundColor: isHighlighted ? theme.colors.primary + "15" : theme.colors.cardBackground },
              isFinished && !isCancelled && {
                borderWidth: 1,
                borderColor: (hasPoints ? successColor : missedColor) + "30",
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
            {/* Home Row: logo + name + result + input */}
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

            {/* Away Row: logo + name + result + input */}
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
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flexDirection: "column",
    marginBottom: 20,
  },
  leagueInfoWrapper: {
    flexDirection: "row",
    marginBottom: 4,
  },
  leagueInfoRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  leftSpacer: {
    width: 48,
  },
  chevronSpacer: {
    width: 48,
  },
  statusContainer: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  matchNumber: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },
  rightSpacer: {
    width: 48,
  },
  pointsContainer: {
    width: 48,
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
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardShadowWrapper: {
    flex: 1,
    borderRadius: 10,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 5,
  },
  cardShadowWrapperPressed: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    transform: [{ scale: 0.98 }],
  },
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0,
  },
  chevronContainer: {
    width: 48,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
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
  chevron: {
    fontSize: 20,
    opacity: 0.5,
  },
});
