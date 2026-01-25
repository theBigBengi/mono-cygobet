// features/home/components/HomeModeSelector.tsx
// 3-way mode selector for home tab: Upcoming games | Leagues | Teams.
// English only. Uses theme colors, spacing, radius.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export type HomeMode = "fixtures" | "leagues" | "teams";

const MODES: { value: HomeMode; label: string }[] = [
  { value: "fixtures", label: "Upcoming games" },
  { value: "leagues", label: "Leagues" },
  { value: "teams", label: "Teams" },
];

interface HomeModeSelectorProps {
  value: HomeMode;
  onChange: (mode: HomeMode) => void;
}

export function HomeModeSelector({ value, onChange }: HomeModeSelectorProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
          padding: theme.spacing.xs,
        },
      ]}
    >
      {MODES.map((m) => {
        const isSelected = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(m.value)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : "transparent",
                borderRadius: theme.radius.sm,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                opacity: pressed && !isSelected ? 0.7 : 1,
              },
            ]}
          >
            <AppText
              variant="body"
              style={{
                fontWeight: "600",
                color: isSelected
                  ? theme.colors.primaryText
                  : theme.colors.textPrimary,
              }}
            >
              {m.label}
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
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
