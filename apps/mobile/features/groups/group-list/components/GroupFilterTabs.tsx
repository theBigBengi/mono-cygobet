// features/groups/group-list/components/GroupFilterTabs.tsx
// Game-like horizontal filter tabs for the groups list.
// 3D effects, haptics, and press animations.

import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";

export type GroupFilterType =
  | "all"
  | "active"
  | "drafts"
  | "ended";

interface GroupFilterTabsProps {
  selectedFilter: GroupFilterType;
  onFilterChange: (filter: GroupFilterType) => void;
  counts: {
    all: number;
    active: number;
    drafts: number;
    ended: number;
  };
}

const FILTERS: { key: GroupFilterType; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "active", labelKey: "groups.filterActive", icon: "flash" },
  { key: "drafts", labelKey: "groups.filterDrafts", icon: "construct-outline" },
  { key: "ended", labelKey: "groups.filterEnded", icon: "checkmark-done" },
];

export function GroupFilterTabs({
  selectedFilter,
  onFilterChange,
  counts,
}: GroupFilterTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const handleFilterPress = (filter: GroupFilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterChange(filter);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTERS.map((filter) => {
          const count = counts[filter.key];
          if (count === 0) {
            return null;
          }
          const isSelected = selectedFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              onPress={() => handleFilterPress(filter.key)}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  borderBottomColor: isSelected
                    ? "rgba(0,0,0,0.2)"
                    : theme.colors.textSecondary + "40",
                  shadowColor: "#000",
                  shadowOpacity: pressed ? 0 : isSelected ? 0.3 : 0.1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isSelected ? "#fff" : theme.colors.textSecondary,
                  },
                ]}
              >
                {t(filter.labelKey)}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.25)"
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected ? "#fff" : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
