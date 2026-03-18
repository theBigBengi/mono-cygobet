// features/groups/group-list/components/FilterSortSheet.tsx
// Combined bottom sheet with filter chips + sort options for the groups list.

import React, { useCallback, useState, useEffect } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import type { GroupFilterType, GroupSortType } from "../hooks/useGroupFilter";

const FILTERS: { key: GroupFilterType; labelKey: string }[] = [
  { key: "active", labelKey: "groups.filterActive" },
  { key: "ended", labelKey: "groups.filterEnded" },
];

const SORT_OPTIONS: { key: GroupSortType; labelKey: string }[] = [
  { key: "recents", labelKey: "groups.sortRecents" },
  { key: "recentlyAdded", labelKey: "groups.sortRecentlyAdded" },
  { key: "alphabetical", labelKey: "groups.sortAlphabetical" },
  { key: "creator", labelKey: "groups.sortCreator" },
];

interface FilterSortSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  selectedFilter: GroupFilterType;
  selectedSort: GroupSortType;
  onFilterChange: (filter: GroupFilterType) => void;
  onSortChange: (sort: GroupSortType) => void;
  counts: { all: number; active: number; ended: number };
}

export function FilterSortSheet({
  sheetRef,
  selectedFilter,
  selectedSort,
  onFilterChange,
  onSortChange,
  counts,
}: FilterSortSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Local draft state — only committed on Apply
  const [localFilter, setLocalFilter] = useState(selectedFilter);
  const [localSort, setLocalSort] = useState(selectedSort);

  // Sync local state when sheet opens (parent values may have changed)
  useEffect(() => {
    setLocalFilter(selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    setLocalSort(selectedSort);
  }, [selectedSort]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleFilterPress = (filter: GroupFilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilter(filter);
  };

  const handleSortPress = (sort: GroupSortType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSort(sort);
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFilterChange(localFilter);
    onSortChange(localSort);
    sheetRef.current?.dismiss();
  };

  const handleCancel = () => {
    // Revert to parent values
    setLocalFilter(selectedFilter);
    setLocalSort(selectedSort);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors.surfaceElevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textDisabled }}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Centered title */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t("groups.filterAndSort")}
        </Text>

        {/* Divider below title */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Filter by */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
          {t("groups.filterBy")}
        </Text>
        <View style={styles.chipRow}>
          {FILTERS.map((filter) => {
            const count = counts[filter.key];
            if (count === 0) return null;
            const isSelected = localFilter === filter.key;

            return (
              <Pressable
                key={filter.key}
                onPress={() => handleFilterPress(filter.key)}
                style={({ pressed }) => [
                  styles.chip,
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
                    styles.chipText,
                    {
                      color: isSelected ? theme.colors.textInverse : theme.colors.textPrimary + "90",
                    },
                  ]}
                >
                  {t(filter.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Divider between sections */}
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {/* Sort by */}
        <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
          {t("groups.sortBy")}
        </Text>
        {SORT_OPTIONS.map((option) => {
          const isSelected = localSort === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => handleSortPress(option.key)}
              style={({ pressed }) => [
                styles.option,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textPrimary,
                    fontWeight: isSelected ? "700" : "400",
                  },
                ]}
              >
                {t(option.labelKey)}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={22}
                  color={theme.colors.primary}
                />
              )}
            </Pressable>
          );
        })}

        {/* Cancel / Apply buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: theme.colors.textSecondary + "60" },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
              {t("groups.cancel")}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.applyButton,
              { backgroundColor: theme.colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textInverse }]}>
              {t("groups.apply")}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  applyButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
