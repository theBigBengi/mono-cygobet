// features/group-creation/filters/FilterSheet.tsx
// BottomSheet for advanced filters (leagues) - follows app's InfoSheet pattern.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { LeagueFilterList } from "./LeagueFilterList";

interface FilterSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  selectedLeagueIds: number[];
  onApply: (leagueIds: number[]) => void;
  onClear: () => void;
}

export function FilterSheet({
  sheetRef,
  selectedLeagueIds,
  onApply,
  onClear,
}: FilterSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>([]);

  const snapPoints = useMemo(() => ["70%", "90%"], []);

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    }),
    [theme.colors.surface]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        // Reset local state when sheet closes
      } else {
        // Sync local state when sheet opens
        setLocalSelectedIds(selectedLeagueIds);
      }
    },
    [selectedLeagueIds]
  );

  const handleApply = () => {
    onApply(localSelectedIds);
  };

  const handleClear = () => {
    setLocalSelectedIds([]);
    onClear();
  };

  const hasFilters = localSelectedIds.length > 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      onChange={handleSheetChange}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.header}>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {t("groupCreation.filtersLeaguesSection")}
          </AppText>
          {hasFilters && (
            <Pressable
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText variant="body" color="primary" style={styles.clearText}>
                {t("groupCreation.filtersClear")}
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.content}>
          <LeagueFilterList
            selectedLeagueIds={localSelectedIds}
            onSelectionChange={setLocalSelectedIds}
          />
        </View>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Button
            label={
              hasFilters
                ? t("groupCreation.filtersApplyCount", { count: localSelectedIds.length })
                : t("groupCreation.filtersApply")
            }
            onPress={handleApply}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontWeight: "700",
  },
  clearText: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
});
