import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export type OutcomeOption = "home" | "draw" | "away";

type Props = {
  selectedOutcome: OutcomeOption | null;
  isEditable: boolean;
  onSelect: (outcome: OutcomeOption) => void;
};

const OUTCOME_LABELS: Record<OutcomeOption, string> = {
  home: "1",
  draw: "X",
  away: "2",
};

/**
 * Outcome picker for MatchWinner mode: 1 (home win), X (draw), 2 (away win).
 * Canonical storage: home → 1:0, draw → 0:0, away → 0:1.
 */
export function OutcomePicker({
  selectedOutcome,
  isEditable,
  onSelect,
}: Props) {
  const { theme } = useTheme();

  const outcomes: OutcomeOption[] = ["home", "draw", "away"];

  return (
    <View style={styles.container}>
      {outcomes.map((outcome) => {
        const isSelected = selectedOutcome === outcome;
        return (
          <Pressable
            key={outcome}
            onPress={() => {
              if (isEditable) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(outcome);
              }
            }}
            disabled={!isEditable}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: isSelected
                  ? theme.colors.primary
                  : theme.colors.border,
                opacity: !isEditable ? 0.5 : 1,
                shadowOpacity: pressed ? 0 : isSelected ? 0.2 : 0.1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <AppText
              variant="body"
              style={[
                styles.label,
                {
                  color: isSelected
                    ? theme.colors.primaryText
                    : theme.colors.textPrimary,
                  fontWeight: isSelected ? "700" : "600",
                },
              ]}
            >
              {OUTCOME_LABELS[outcome]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  button: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 16,
  },
});
