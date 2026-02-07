// features/groups/group-lobby/components/DraftScoringContent.tsx
// Scoring form content (counter rows) for use inside SettingsRowBottomSheet.Sheet.

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export interface DraftScoringValues {
  onTheNose: number;
  goalDifference: number;
  outcome: number;
}

const MIN_SCORE = 1;
const MAX_SCORE = 10;

function clamp(value: number): number {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, value));
}

interface DraftScoringContentProps {
  values: DraftScoringValues;
  predictionMode: "result" | "3way";
  onChange: (values: DraftScoringValues) => void;
  disabled?: boolean;
}

export function DraftScoringContent({
  values,
  predictionMode,
  onChange,
  disabled = false,
}: DraftScoringContentProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [onTheNose, setOnTheNose] = useState(values.onTheNose);
  const [goalDifference, setGoalDifference] = useState(values.goalDifference);
  const [outcome, setOutcome] = useState(values.outcome);

  useEffect(() => {
    setOnTheNose(clamp(values.onTheNose));
    setGoalDifference(clamp(values.goalDifference));
    setOutcome(clamp(values.outcome));
  }, [values.onTheNose, values.goalDifference, values.outcome]);

  const handleValueChange = (
    type: "onTheNose" | "goalDifference" | "outcome",
    delta: number
  ) => {
    if (disabled) return;
    const update = (current: number, setter: (n: number) => void): number => {
      const next = clamp(current + delta);
      setter(next);
      return next;
    };
    let newOnTheNose = onTheNose;
    let newGoalDifference = goalDifference;
    let newOutcome = outcome;
    if (type === "onTheNose") newOnTheNose = update(onTheNose, setOnTheNose);
    else if (type === "goalDifference")
      newGoalDifference = update(goalDifference, setGoalDifference);
    else newOutcome = update(outcome, setOutcome);
    onChange({
      onTheNose: newOnTheNose,
      goalDifference: newGoalDifference,
      outcome: newOutcome,
    });
  };

  const ScoreRow = ({
    rowLabel,
    value,
    onDecrement,
    onIncrement,
  }: {
    rowLabel: string;
    value: number;
    onDecrement: () => void;
    onIncrement: () => void;
  }) => (
    <View style={styles.scoreRow}>
      <AppText variant="body" style={styles.scoreLabel}>
        {rowLabel}
      </AppText>
      <View style={styles.scoreControls}>
        <Pressable
          onPress={onDecrement}
          disabled={disabled || value <= MIN_SCORE}
          style={({ pressed }) => [
            styles.controlButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: disabled || value <= MIN_SCORE ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="body" style={styles.scoreValue}>
          {value}
        </AppText>
        <Pressable
          onPress={onIncrement}
          disabled={disabled || value >= MAX_SCORE}
          style={({ pressed }) => [
            styles.controlButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: disabled || value >= MAX_SCORE ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScoreRow
        rowLabel={t("lobby.onTheNose")}
        value={onTheNose}
        onDecrement={() => handleValueChange("onTheNose", -1)}
        onIncrement={() => handleValueChange("onTheNose", 1)}
      />
      {predictionMode === "result" && (
        <>
          <View
            style={[styles.divider, { borderBottomColor: theme.colors.border }]}
          />
          <ScoreRow
            rowLabel={t("lobby.goalPointDifference")}
            value={goalDifference}
            onDecrement={() => handleValueChange("goalDifference", -1)}
            onIncrement={() => handleValueChange("goalDifference", 1)}
          />
          <View
            style={[styles.divider, { borderBottomColor: theme.colors.border }]}
          />
        </>
      )}
      <ScoreRow
        rowLabel={t("lobby.outcome")}
        value={outcome}
        onDecrement={() => handleValueChange("outcome", -1)}
        onIncrement={() => handleValueChange("outcome", 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  scoreLabel: { fontWeight: "500", flex: 1 },
  scoreControls: { flexDirection: "row", alignItems: "center", gap: 16 },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: { fontWeight: "600", minWidth: 24, textAlign: "center" },
  divider: { borderBottomWidth: 1, marginVertical: 4 },
});
