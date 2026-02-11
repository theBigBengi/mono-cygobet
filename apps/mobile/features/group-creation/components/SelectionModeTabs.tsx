// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Text tabs with underline indicator: selected = primary text + underline; unselected = secondary text.

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
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: isSelected ? "600" : "400",
                  },
                ]}
              >
                {t(m.labelKey as any)}
              </AppText>
              {isSelected && (
                <View
                  style={[
                    styles.underline,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
              )}
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
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },
});
