// features/groups/group-list/components/GroupSortRow.tsx
// Summary row: filter/sort label (tappable) on left, view toggle on right.

import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import type { GroupFilterType, GroupSortType } from "../hooks/useGroupFilter";

export type GroupViewMode = "card" | "row";

const FILTER_LABEL_KEYS: Record<GroupFilterType, string> = {
  all: "groups.filterAll",
  active: "groups.filterActive",
  ended: "groups.filterEnded",
};

const SORT_LABEL_KEYS: Record<GroupSortType, string> = {
  recents: "groups.sortRecents",
  recentlyAdded: "groups.sortRecentlyAdded",
  alphabetical: "groups.sortAlphabetical",
  creator: "groups.sortCreator",
};

interface GroupSortRowProps {
  selectedFilter: GroupFilterType;
  selectedSort: GroupSortType;
  viewMode: GroupViewMode;
  onFilterSortPress: () => void;
  onViewModeToggle: () => void;
}

export function GroupSortRow({
  selectedFilter,
  selectedSort,
  viewMode,
  onFilterSortPress,
  onViewModeToggle,
}: GroupSortRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const handleFilterSortPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterSortPress();
  };

  const handleViewToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewModeToggle();
  };

  const filterLabel = t(FILTER_LABEL_KEYS[selectedFilter]);
  const sortLabel = t(SORT_LABEL_KEYS[selectedSort]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md }]}>
      <Pressable
        onPress={handleFilterSortPress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed }) => [
          styles.filterSortButton,
          pressed && { opacity: 0.5 },
        ]}
      >
        <Ionicons
          name="options-outline"
          size={14}
          color={theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.filterSortLabel,
            { color: theme.colors.textSecondary },
          ]}
        >
          {filterLabel} {"\u00B7"} {sortLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleViewToggle}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed }) => [
          styles.viewToggle,
          pressed && { opacity: 0.5 },
        ]}
      >
        <Ionicons
          name={viewMode === "card" ? "list" : "grid-outline"}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // paddingHorizontal: theme.spacing.md — applied inline
    paddingVertical: 10,
  },
  filterSortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterSortLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewToggle: {
    padding: 4, // theme.spacing.xs
  },
});
