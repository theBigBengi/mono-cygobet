// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Pill-shaped tabs (like reference): unselected = white + primary border + primary text; selected = primary fill + white text.
// Layout: full-width row, equal-width pills, fixed height bar.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export type SelectionMode = "fixtures" | "leagues" | "teams";

interface SelectionModeTabsProps {
  value: SelectionMode;
  onChange: (mode: SelectionMode) => void;
}

export function SelectionModeTabs({ value, onChange }: SelectionModeTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const MODES: { value: SelectionMode; labelKey: string }[] = [
    { value: "fixtures", labelKey: "groupCreation.games" },
    { value: "leagues", labelKey: "groupCreation.leagues" },
    { value: "teams", labelKey: "groupCreation.teams" },
  ];

  return (
    <View style={styles.wrapper}>
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
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.background,
                  borderColor: theme.colors.primary,
                  borderWidth: 1.5,
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
                      ? theme.colors.primaryText
                      : theme.colors.primary,
                    fontWeight: "500",
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    // paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  tab: {
    // flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 999,
    minWidth: "30%",
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
