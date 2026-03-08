// features/groups/group-list/components/GroupFilterTabs.tsx
// Minimal horizontal filter tabs for the groups list.

import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";

export type GroupFilterType =
  | "all"
  | "active"
  | "ended";

interface GroupFilterTabsProps {
  selectedFilter: GroupFilterType;
  onFilterChange: (filter: GroupFilterType) => void;
  counts: {
    all: number;
    active: number;
    ended: number;
  };
}

const FILTERS: { key: GroupFilterType; labelKey: string }[] = [
  { key: "active", labelKey: "groups.filterActive" },
  { key: "ended", labelKey: "groups.filterEnded" },
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
    <View style={styles.container}>
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
                    : theme.colors.textSecondary + "20",
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isSelected ? "#fff" : theme.colors.textPrimary + "90",
                  },
                ]}
              >
                {t(filter.labelKey)}
              </Text>
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
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
