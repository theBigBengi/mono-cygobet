// features/groups/group-lobby/components/NudgeWindowPicker.tsx
// Chip-based picker for nudge window (minutes before kickoff).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

const NUDGE_WINDOW_OPTIONS = [30, 60, 120, 180] as const;

interface NudgeWindowPickerProps {
  value: number;
  onValueChange: (minutes: number) => void;
  disabled?: boolean;
}

export function NudgeWindowPicker({
  value,
  onValueChange,
  disabled,
}: NudgeWindowPickerProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: theme.spacing.md }]}>
      <View style={styles.labelRow}>
        <AppText variant="body" style={styles.label}>
          {t("lobby.minutesBeforeKickoff")}
        </AppText>
      </View>
      <View style={styles.chips}>
        {NUDGE_WINDOW_OPTIONS.map((min) => (
          <Pressable
            key={min}
            onPress={() => onValueChange(min)}
            disabled={disabled}
            style={[
              styles.chip,
              {
                backgroundColor:
                  value === min ? theme.colors.primary : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="body"
              style={{
                color:
                  value === min
                    ? theme.colors.primaryText
                    : theme.colors.textPrimary,
              }}
            >
              {min}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  labelRow: {
    marginBottom: 8,
  },
  label: {
    fontWeight: "500",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
