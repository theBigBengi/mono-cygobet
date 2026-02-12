// features/groups/group-list/components/GroupFilterTabs.tsx
// Horizontal filter tabs for the groups list: All, Attention, Active, Drafts, Ended.

import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export type GroupFilterType =
  | "all"
  | "attention"
  | "active"
  | "drafts"
  | "ended";

interface GroupFilterTabsProps {
  selectedFilter: GroupFilterType;
  onFilterChange: (filter: GroupFilterType) => void;
  counts: {
    all: number;
    attention: number;
    active: number;
    drafts: number;
    ended: number;
  };
}

const FILTERS: { key: GroupFilterType; labelKey: string }[] = [
  { key: "attention", labelKey: "groups.filterAttention" },
  { key: "active", labelKey: "groups.filterActive" },
  { key: "drafts", labelKey: "groups.filterDrafts" },
  { key: "ended", labelKey: "groups.filterEnded" },
];

export function GroupFilterTabs({
  selectedFilter,
  onFilterChange,
  counts,
}: GroupFilterTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

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
          const showBadge =
            filter.key === "attention" && count > 0 && !isSelected;

          return (
            <Pressable
              key={filter.key}
              onPress={() => onFilterChange(filter.key)}
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
              <View style={styles.tabContent}>
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
                  {t(filter.labelKey)} ({count})
                </AppText>
                {showBadge && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.colors.danger },
                    ]}
                  />
                )}
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
    marginBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
