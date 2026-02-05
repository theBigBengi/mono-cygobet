// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Selected state: text color only (no background pill).
// English only. Uses theme colors, spacing, radius.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export type SelectionMode = "fixtures" | "leagues" | "teams";

interface SelectionModeTabsProps {
  value: SelectionMode;
  onChange: (mode: SelectionMode) => void;
}

export function SelectionModeTabs({ value, onChange }: SelectionModeTabsProps) {
  const { t } = useTranslation("common");
  const { theme, colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const MODES: { value: SelectionMode; labelKey: string }[] = [
    { value: "fixtures", labelKey: "groupCreation.games" },
    { value: "leagues", labelKey: "groupCreation.leagues" },
    { value: "teams", labelKey: "groupCreation.teams" },
  ];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            borderColor: theme.colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          {MODES.map((m) => {
            const isSelected = value === m.value;
            return (
              <Pressable
                key={m.value}
                onPress={() => onChange(m.value)}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.tabText,
                    {
                      color: isSelected
                        ? theme.colors.primary
                        : theme.colors.textPrimary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {t(m.labelKey as any)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  container: {
    overflow: "hidden",
    borderWidth: 1,
    minHeight: 42,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
