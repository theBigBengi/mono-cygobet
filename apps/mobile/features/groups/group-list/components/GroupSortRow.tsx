// features/groups/group-list/components/GroupSortRow.tsx
// Sort row displayed between filter tabs and group list.
// Shows current sort option (tappable to open sort sheet) and a view toggle icon.

import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import type { GroupSortType } from "../hooks/useGroupFilter";

export type GroupViewMode = "card" | "row";

const SORT_LABEL_KEYS: Record<GroupSortType, string> = {
  recents: "groups.sortRecents",
  recentlyAdded: "groups.sortRecentlyAdded",
  alphabetical: "groups.sortAlphabetical",
  creator: "groups.sortCreator",
};

interface GroupSortRowProps {
  selectedSort: GroupSortType;
  viewMode: GroupViewMode;
  onSortPress: () => void;
  onViewModeToggle: () => void;
}

export function GroupSortRow({ selectedSort, viewMode, onSortPress, onViewModeToggle }: GroupSortRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const handleSortPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortPress();
  };

  const handleViewToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewModeToggle();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Pressable
        onPress={handleSortPress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={({ pressed }) => [
          styles.sortButton,
          pressed && { opacity: 0.5 },
        ]}
      >
        <Ionicons
          name="swap-vertical"
          size={18}
          color={theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.sortLabel,
            { color: theme.colors.textSecondary },
          ]}
        >
          {t(SORT_LABEL_KEYS[selectedSort])}
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
          size={20}
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
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  viewToggle: {
    padding: 4,
  },
});
