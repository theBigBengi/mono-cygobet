// features/groups/group-lobby/components/PredictionModeSelector.tsx
// Component for selecting prediction mode (Result / 3-Way Prediction).
// Allows choosing between different prediction types for the group.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText, Divider } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export type PredictionMode = "result" | "3way";

interface PredictionModeSelectorProps {
  /**
   * Current selected prediction mode
   */
  value: PredictionMode;
  /**
   * Callback when prediction mode changes
   */
  onChange: (value: PredictionMode) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

/**
 * Component for selecting prediction mode.
 * Shows two options: Result and 3-Way Prediction with descriptions.
 */
export function PredictionModeSelector({
  value,
  onChange,
  disabled = false,
}: PredictionModeSelectorProps) {
  const { theme } = useTheme();

  const handleSelect = (mode: PredictionMode) => {
    if (disabled) return;
    onChange(mode);
  };

  const OptionRow = ({
    mode,
    title,
    description,
  }: {
    mode: PredictionMode;
    title: string;
    description: string;
  }) => {
    const isSelected = value === mode;

    return (
      <Pressable
        onPress={() => handleSelect(mode)}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [
          styles.optionRow,
          {
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <AppText variant="body" style={styles.optionTitle}>
              {title}
            </AppText>
            <Ionicons
              name={isSelected ? "checkmark-circle" : "radio-button-off"}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
          <AppText variant="caption" color="secondary" style={styles.optionDescription}>
            {description}
          </AppText>
        </View>
      </Pressable>
    );
  };

  return (
    <Card style={styles.section}>
      <AppText variant="body" style={styles.title}>
        Select Make Prediction mode
      </AppText>

      <View style={styles.optionsContainer}>
        <OptionRow
          mode="result"
          title="Result"
          description='"Result" mode is for predicting the match result. Points are awarded for exact predictions (prediction: 3-1, result 3-1), goal difference (prediction: 3-1, result: 2-0) and outcome (prediction: 3-1, result 2-1).'
        />
        <Divider style={styles.divider} />
        <OptionRow
          mode="3way"
          title="3-Way Prediction"
          description='In "3-Way Prediction" mode, predictions are 1-0-2 (1 = home win, 0 = draw, 2 = away win).'
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  title: {
    fontWeight: "600",
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 0,
  },
  optionRow: {
    paddingVertical: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitle: {
    fontWeight: "600",
    flex: 1,
  },
  optionDescription: {
    lineHeight: 18,
  },
  divider: {
    marginVertical: 0,
  },
});
