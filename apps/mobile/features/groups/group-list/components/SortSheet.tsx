// features/groups/group-list/components/SortSheet.tsx
// Bottom sheet with sort options for the groups list.

import React, { useCallback } from "react";
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
import type { GroupSortType } from "../hooks/useGroupFilter";

const SORT_OPTIONS: { key: GroupSortType; labelKey: string }[] = [
  { key: "recents", labelKey: "groups.sortRecents" },
  { key: "recentlyAdded", labelKey: "groups.sortRecentlyAdded" },
  { key: "alphabetical", labelKey: "groups.sortAlphabetical" },
  { key: "creator", labelKey: "groups.sortCreator" },
];

interface SortSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  selectedSort: GroupSortType;
  onSortChange: (sort: GroupSortType) => void;
}

export function SortSheet({ sheetRef, selectedSort, onSortChange }: SortSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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

  const handleSelect = (sort: GroupSortType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSortChange(sort);
    sheetRef.current?.dismiss();
  };

  const handleCancel = () => {
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
          {t("groups.sortBy")}
        </Text>

        {SORT_OPTIONS.map((option) => {
          const isSelected = selectedSort === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => handleSelect(option.key)}
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

        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && { opacity: 0.5 },
          ]}
        >
          <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
            {t("common.cancel")}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 17,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
