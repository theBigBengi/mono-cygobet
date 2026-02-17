// features/groups/group-list/components/GroupFilterTabs.tsx
// Horizontal filter tabs for the groups list: Active, Drafts, Ended.
// Styled to match the lobby design patterns.

import React from "react";
import { View, ScrollView, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
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

const FILTERS: { key: GroupFilterType; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "active", labelKey: "groups.filterActive", icon: "flash" },
  { key: "drafts", labelKey: "groups.filterDrafts", icon: "construct-outline" },
  { key: "ended", labelKey: "groups.filterEnded", icon: "checkmark-done" },
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          onJoinPress && { paddingRight: 56 },
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
                    : theme.colors.surface,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
                pressed && styles.tabPressed,
              ]}
            >
              <Ionicons
                name={filter.icon}
                size={14}
                color={isSelected ? "#fff" : theme.colors.textSecondary}
              />
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

        {/* Public tab - navigates to discover screen */}
        <Pressable
          onPress={onPublicPress}
          style={({ pressed }) => [
            styles.tab,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed && styles.tabPressed,
          ]}
        >
          <Ionicons
            name="globe-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t("groups.filterPublic")}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Fixed join button on the right */}
      {onJoinPress && (
        <View
          style={[
            styles.joinButtonContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <Pressable
            onPress={onJoinPress}
            style={({ pressed }) => [
              styles.joinButton,
              {
                backgroundColor: theme.colors.primary + "15",
                borderColor: theme.colors.primary + "40",
              },
              pressed && styles.tabPressed,
            ]}
          >
            <Ionicons
              name="enter-outline"
              size={18}
              color={theme.colors.primary}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  joinButtonContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    paddingLeft: 8,
    paddingRight: 16,
    justifyContent: "center",
  },
  joinButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
