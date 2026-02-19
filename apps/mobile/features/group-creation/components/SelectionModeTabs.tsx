// features/group-creation/components/SelectionModeTabs.tsx
// 3-way mode selector for group creation: Upcoming games | Leagues | Teams.
// Game-like HUD style with shadows, haptics, and press effects.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

export type SelectionMode = "fixtures" | "leagues" | "teams";

interface SelectionModeTabsProps {
  value: SelectionMode;
  onChange: (mode: SelectionMode) => void;
}

export function SelectionModeTabs({ value, onChange }: SelectionModeTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [pressedTab, setPressedTab] = useState<SelectionMode | null>(null);

  const MODES: { value: SelectionMode; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: "fixtures", labelKey: "groupCreation.games", icon: "football" },
    { value: "leagues", labelKey: "groupCreation.leagues", icon: "trophy" },
    { value: "teams", labelKey: "groupCreation.teams", icon: "shirt" },
  ];

  const handlePress = (mode: SelectionMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(mode);
  };

  const handlePressIn = (mode: SelectionMode) => {
    setPressedTab(mode);
  };

  const handlePressOut = () => {
    setPressedTab(null);
  };

  return (
    <View style={styles.wrapper}>
      {MODES.map((m) => {
          const isSelected = value === m.value;
          const isPressed = pressedTab === m.value;

          return (
            <Pressable
              key={m.value}
              onPress={() => handlePress(m.value)}
              onPressIn={() => handlePressIn(m.value)}
              onPressOut={handlePressOut}
              style={[
                styles.tab,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderBottomColor: isSelected
                    ? theme.colors.primary + "80"
                    : theme.colors.textSecondary + "40",
                  shadowColor: isSelected ? theme.colors.primary : "#000",
                  shadowOpacity: isPressed ? 0 : isSelected ? 0.3 : 0.15,
                  transform: [{ scale: isPressed ? 0.96 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.25)"
                      : theme.colors.textSecondary + "15",
                  },
                ]}
              >
                <Ionicons
                  name={m.icon}
                  size={12}
                  color={isSelected ? "#fff" : theme.colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isSelected ? "#fff" : theme.colors.textSecondary,
                  },
                ]}
              >
                {t(m.labelKey as any)}
              </Text>
            </Pressable>
          );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
