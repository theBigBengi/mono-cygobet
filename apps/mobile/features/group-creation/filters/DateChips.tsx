// features/group-creation/filters/DateChips.tsx
// Layer 1: horizontal scrolling date pills + filter icon with badge.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { DateRangeKey } from "./useFixtureFilters";

const DATE_OPTIONS: { value: DateRangeKey; labelKey: string }[] = [
  { value: "all", labelKey: "groupCreation.dateAll" },
  { value: "today", labelKey: "groupCreation.dateToday" },
  { value: "tomorrow", labelKey: "groupCreation.dateTomorrow" },
  { value: "3days", labelKey: "groupCreation.date3Days" },
  { value: "week", labelKey: "groupCreation.dateThisWeek" },
];

interface DateChipsProps {
  selected: DateRangeKey;
  onSelect: (range: DateRangeKey) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

const FALLBACK_LABELS: Record<DateRangeKey, string> = {
  all: "All",
  today: "Today",
  tomorrow: "Tomorrow",
  "3days": "3 Days",
  week: "This Week",
};

export function DateChips({
  selected,
  onSelect,
  activeFilterCount,
  onOpenFilters,
}: DateChipsProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {DATE_OPTIONS.map(({ value, labelKey }) => {
          const isActive = selected === value;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.chipWrap,
                pressed && styles.chipPressed,
              ]}
            >
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.colors.cardBackground,
                    borderColor: isActive
                      ? theme.colors.primary
                      : theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.chipText,
                    {
                      color: isActive
                        ? theme.colors.primaryText
                        : theme.colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(labelKey, { defaultValue: FALLBACK_LABELS[value] })}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.chipWrap,
            pressed && styles.chipPressed,
          ]}
        >
          <View
            style={[
              styles.chip,
              styles.filterChip,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <MaterialIcons
              name="filter-list"
              size={18}
              color={theme.colors.textPrimary}
              style={styles.filterIcon}
            />
            {activeFilterCount > 0 && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[styles.badgeText, { color: theme.colors.primaryText }]}
                >
                  {activeFilterCount > 99 ? "99+" : activeFilterCount}
                </AppText>
              </View>
            )}
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipWrap: {
    borderRadius: 20,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
  },
  filterChip: {
    position: "relative",
  },
  filterIcon: {
    marginRight: 0,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
