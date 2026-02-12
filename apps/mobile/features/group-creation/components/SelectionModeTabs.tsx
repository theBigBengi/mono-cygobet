// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Text tabs with underline indicator: selected = primary text + underline; unselected = secondary text.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export type SelectionMode = "fixtures" | "leagues" | "teams";

interface SelectionModeTabsProps {
  value: SelectionMode;
  onChange: (mode: SelectionMode) => void;
  onInfoPress?: () => void;
}

export function SelectionModeTabs({ value, onChange, onInfoPress }: SelectionModeTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const MODES: { value: SelectionMode; labelKey: string }[] = [
    { value: "fixtures", labelKey: "groupCreation.games" },
    { value: "leagues", labelKey: "groupCreation.leagues" },
    { value: "teams", labelKey: "groupCreation.teams" },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabsRow}>
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
                    : theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  {
                    color: isSelected ? "#fff" : theme.colors.textSecondary,
                    fontWeight: isSelected ? "600" : "500",
                  },
                ]}
              >
                {t(m.labelKey as any)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onInfoPress}
        style={({ pressed }) => [
          styles.infoButton,
          { opacity: pressed ? 0.5 : 1 },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={24}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingStart: 8,
    paddingEnd: 12,
    minHeight: 44,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  infoButton: {
    padding: 4,
  },
});
