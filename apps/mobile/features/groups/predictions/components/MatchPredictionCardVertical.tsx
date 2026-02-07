import React from "react";
import { View, StyleSheet, TextInput, Pressable, Text } from "react-native";
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
import { PointsTimeDisplay } from "./PointsTimeDisplay";

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
  savedPredictions: Set<number>;
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
  savedPredictions,
  cardRef,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
  predictionMode = "CorrectScore",
  onSelectOutcome,
  onPressCard: onPressCardProp,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();
  const fixtureIdStr = String(fixture.id);

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

  return (
    <View ref={cardRef}>
      <Card
        style={[
          styles.matchCard,
          cardRadiusStyle,
          cardBorderStyle,
          { backgroundColor: theme.colors.cardBackground },
        ]}
      >
        <View style={styles.matchContent}>
          {/* Only teams area (logos + names) navigates to fixture detail; checkbox/time do not */}
          <Pressable
            onPress={onPressCard}
            style={({ pressed }) => [
              styles.rowsWrapper,
              {
                opacity: pressed ? 0.7 : isCancelled ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.rowsContainer}>
              {/* Home Team Row */}
              <TeamRow
                team={fixture.homeTeam}
                teamName={homeTeamName}
                isWinner={isHomeWinner}
              />

              {/* Away Team Row */}
              <TeamRow
                team={fixture.awayTeam}
                teamName={awayTeamName}
                isWinner={isAwayWinner}
              />
            </View>
            {onPressCardProp != null && (
              <Text
                style={[styles.chevron, { color: theme.colors.textSecondary }]}
                allowFontScaling={false}
              >
                ›
              </Text>
            )}
          </Pressable>

          {/* Result - displayed vertically in the middle (only when game started or finished) */}
          <ResultDisplay
            result={gameResultOrTime}
            isLive={isLive}
            isFinished={isFinished}
            isCancelled={isCancelled}
            isHomeWinner={isHomeWinner}
            isAwayWinner={isAwayWinner}
          />

          {/* Prediction Inputs - displayed vertically on the right */}
          <View style={styles.predictionsContainer}>
            {predictionMode === "MatchWinner" && onSelectOutcome ? (
              <OutcomePicker
                selectedOutcome={getOutcomeFromPrediction(prediction)}
                isEditable={isEditable}
                onSelect={onSelectOutcome}
              />
            ) : (
              <>
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
                />
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
                />
              </>
            )}
          </View>

          {/* Time/Points - displayed once on the right */}
          <PointsTimeDisplay
            isEditable={isEditable}
            isLive={isLive}
            isFinished={isFinished}
            time={gameResultOrTime?.time || null}
            points={points}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    marginHorizontal: 4,
    marginBottom: 0,
    padding: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowsWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowsContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
  chevron: {
    fontSize: 12,
    opacity: 0.4,
  },
  predictionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    flexShrink: 0,
  },
});
