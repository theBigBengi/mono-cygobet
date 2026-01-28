// features/groups/group-lobby/components/KORoundModeSelector.tsx
// Component for selecting KO round mode (90min / extra time / penalties).
// Choose when the prediction applies: after 90 minutes, extra time, or penalty shootout.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText, Divider } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

export type KORoundMode = "90min" | "extraTime" | "penalties";

interface KORoundModeSelectorProps {
  /**
   * Current selected KO round mode
   */
  value: KORoundMode;
  /**
   * Callback when KO round mode changes
   */
  onChange: (value: KORoundMode) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

const DESCRIPTION =
  "Choose whether the prediction is made for the result of a game after 90 minutes, after the extra time or after the penalty shootout.";

const OPTIONS: { mode: KORoundMode; title: string }[] = [
  { mode: "90min", title: "After 90 minutes" },
  { mode: "extraTime", title: "After extra time" },
  { mode: "penalties", title: "After penalty shootout" },
];

/**
 * Component for selecting KO round mode.
 * Shows three options: After 90 minutes, After extra time, After penalty shootout.
 */
export function KORoundModeSelector({
  value,
  onChange,
  disabled = false,
}: KORoundModeSelectorProps) {
  const { theme } = useTheme();

  const handleSelect = (mode: KORoundMode) => {
    if (disabled) return;
    onChange(mode);
  };

  return (
    <Card style={styles.section}>
      <AppText variant="body" style={styles.title}>
        Select KO round mode
      </AppText>
      <AppText variant="caption" color="secondary" style={styles.description}>
        {DESCRIPTION}
      </AppText>

      <View style={styles.optionsContainer}>
        {OPTIONS.map(({ mode, title }, index) => {
          const isSelected = value === mode;
          return (
            <React.Fragment key={mode}>
              {index > 0 && <Divider style={styles.divider} />}
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
                <AppText variant="body" style={styles.optionTitle}>
                  {title}
                </AppText>
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "radio-button-off"}
                  size={24}
                  color={
                    isSelected ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
              </Pressable>
            </React.Fragment>
          );
        })}
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
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 0,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionTitle: {
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    marginVertical: 0,
  },
});
