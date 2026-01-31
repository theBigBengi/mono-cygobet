// features/groups/group-lobby/components/GroupLobbyScoringSection.tsx
// Component for configuring scoring system for predictions.
// Allows editing point values for On the Nose, Goal/Point Difference, and Outcome.

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Divider } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleSection } from "./CollapsibleSection";

interface GroupLobbyScoringSectionProps {
  /**
   * Initial value for "On the Nose" points
   * @default 3
   */
  initialOnTheNose?: number;
  /**
   * Initial value for "Goal/Point Difference" points
   * @default 2
   */
  initialGoalDifference?: number;
  /**
   * Initial value for "Outcome" points
   * @default 1
   */
  initialOutcome?: number;
  /**
   * Prediction mode: "result" shows all rows, "3way" shows only Outcome
   */
  predictionMode?: "result" | "3way";
  /**
   * Callback when any scoring value changes
   */
  onChange?: (values: {
    onTheNose: number;
    goalDifference: number;
    outcome: number;
  }) => void;
  /**
   * Whether the controls are disabled
   */
  disabled?: boolean;
}

/**
 * Component for displaying and editing scoring system for predictions.
 * Shows three scoring categories with increment/decrement controls.
 */
export function GroupLobbyScoringSection({
  initialOnTheNose = 3,
  initialGoalDifference = 2,
  initialOutcome = 1,
  predictionMode = "result",
  onChange,
  disabled = false,
}: GroupLobbyScoringSectionProps) {
  const { theme } = useTheme();
  const [onTheNose, setOnTheNose] = useState(initialOnTheNose);
  const [goalDifference, setGoalDifference] = useState(initialGoalDifference);
  const [outcome, setOutcome] = useState(initialOutcome);

  useEffect(() => {
    setOnTheNose(initialOnTheNose);
    setGoalDifference(initialGoalDifference);
    setOutcome(initialOutcome);
  }, [initialOnTheNose, initialGoalDifference, initialOutcome]);

  const handleValueChange = (
    type: "onTheNose" | "goalDifference" | "outcome",
    delta: number
  ) => {
    if (disabled) return;

    const updateValue = (current: number, setter: (val: number) => void) => {
      const newValue = Math.max(0, current + delta);
      setter(newValue);
      return newValue;
    };

    let newOnTheNose = onTheNose;
    let newGoalDifference = goalDifference;
    let newOutcome = outcome;

    if (type === "onTheNose") {
      newOnTheNose = updateValue(onTheNose, setOnTheNose);
    } else if (type === "goalDifference") {
      newGoalDifference = updateValue(goalDifference, setGoalDifference);
    } else {
      newOutcome = updateValue(outcome, setOutcome);
    }

    onChange?.({
      onTheNose: newOnTheNose,
      goalDifference: newGoalDifference,
      outcome: newOutcome,
    });
  };

  const ScoreRow = ({
    label,
    value,
    onDecrement,
    onIncrement,
  }: {
    label: string;
    value: number;
    onDecrement: () => void;
    onIncrement: () => void;
  }) => (
    <View>
      <View style={styles.scoreRow}>
        <AppText variant="body" style={styles.scoreLabel}>
          {label}
        </AppText>
        <View style={styles.scoreControls}>
          <Pressable
            onPress={onDecrement}
            disabled={disabled || value <= 0}
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: disabled || value <= 0 ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="remove"
              size={16}
              color={theme.colors.textPrimary}
            />
          </Pressable>
          <AppText variant="body" style={styles.scoreValue}>
            {value}
          </AppText>
          <Pressable
            onPress={onIncrement}
            disabled={disabled}
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={16}
              color={theme.colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const is3way = predictionMode === "3way";
  const { t } = useTranslation("common");
  const selectionLabel = is3way
    ? `${t("lobby.outcome")}: ${outcome}`
    : `${t("lobby.onTheNose")}: ${onTheNose}, ${t("lobby.goalPointDifference")}: ${goalDifference}, ${t("lobby.outcome")}: ${outcome}`;
  const description = t("lobby.scoringDescription");

  return (
    <CollapsibleSection
      title={t("lobby.scoringTitle")}
      selectionLabel={selectionLabel}
      description={description}
    >
      <View style={styles.scoresContainer}>
        {!is3way && (
          <>
            <ScoreRow
              label={t("lobby.onTheNose")}
              value={onTheNose}
              onDecrement={() => handleValueChange("onTheNose", -1)}
              onIncrement={() => handleValueChange("onTheNose", 1)}
            />
            <Divider style={styles.divider} />
            <ScoreRow
              label="Goal/Point Difference"
              value={goalDifference}
              onDecrement={() => handleValueChange("goalDifference", -1)}
              onIncrement={() => handleValueChange("goalDifference", 1)}
            />
            <Divider style={styles.divider} />
          </>
        )}
        <ScoreRow
          label={t("lobby.outcome")}
          value={outcome}
          onDecrement={() => handleValueChange("outcome", -1)}
          onIncrement={() => handleValueChange("outcome", 1)}
        />
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  scoresContainer: {
    gap: 0,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  scoreLabel: {
    fontWeight: "500",
    flex: 1,
  },
  scoreControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  divider: {
    marginVertical: 0,
  },
});
