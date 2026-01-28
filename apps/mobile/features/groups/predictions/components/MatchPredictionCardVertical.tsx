import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getTeamDisplayName } from "@/utils/fixture";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import type { FocusedField } from "../types";
import { useMatchCardState } from "../hooks/useMatchCardState";
import { ScoreInput } from "./ScoreInput";
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
}: Props) {
  const { theme } = useTheme();
  const fixtureIdStr = String(fixture.id);

  // Get refs for input fields
  const homeRef = inputRefs.current[fixtureIdStr]?.home;
  const awayRef = inputRefs.current[fixtureIdStr]?.away;

  // Use hook to get all derived state
  const {
    isEditable,
    isLive,
    isFinished,
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

  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");

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

          {/* Result - displayed vertically in the middle (only when game started or finished) */}
          <ResultDisplay
            result={gameResultOrTime}
            isLive={isLive}
            isFinished={isFinished}
            isHomeWinner={isHomeWinner}
            isAwayWinner={isAwayWinner}
          />

          {/* Prediction Inputs - displayed vertically on the right */}
          <View style={styles.predictionsContainer}>
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
  rowsContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
  predictionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    flexShrink: 0,
  },
});
