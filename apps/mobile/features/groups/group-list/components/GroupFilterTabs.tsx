// features/groups/group-list/components/GroupFilterTabs.tsx
// Horizontal filter tabs for the groups list: All, Attention, Active, Drafts, Ended.

import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

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
  onPublicPress?: () => void;
  onJoinPress?: () => void;
}

const FILTERS: { key: GroupFilterType; labelKey: string }[] = [
  { key: "active", labelKey: "groups.filterActive" },
  { key: "drafts", labelKey: "groups.filterDrafts" },
  { key: "ended", labelKey: "groups.filterEnded" },
];

export function GroupFilterTabs({
  selectedFilter,
  onFilterChange,
  counts,
  onPublicPress,
  onJoinPress,
}: GroupFilterTabsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          onJoinPress && { paddingRight: 50 },
        ]}
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
            </Pressable>
          );
        })}

        {/* Public tab - navigates to discover screen */}
        <Pressable
          onPress={onPublicPress}
          style={({ pressed }) => [
            styles.tab,
            {
              backgroundColor: theme.colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText
            variant="body"
            style={[
              styles.tabText,
              {
                color: theme.colors.textSecondary,
                fontWeight: "500",
              },
            ]}
          >
            {t("groups.filterPublic")}
          </AppText>
        </Pressable>
      </ScrollView>

      {/* Fixed join button on the right */}
      {onJoinPress && (
        <View style={[styles.joinButtonContainer, { backgroundColor: theme.colors.background }]}>
          <Pressable
            onPress={onJoinPress}
            style={({ pressed }) => [
              styles.tab,
              styles.joinButton,
              {
                backgroundColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="enter-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128, 128, 128, 0.3)",
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
  tabText: {
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  joinButtonContainer: {
    position: "absolute",
    right: 0,
    top: 8,
    bottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    justifyContent: "center",
  },
  joinButton: {
    paddingHorizontal: 10,
  },
});
