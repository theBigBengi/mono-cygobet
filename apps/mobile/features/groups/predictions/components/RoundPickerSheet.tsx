// components/RoundPickerSheet.tsx
// Bottom sheet with scrollable list of rounds and status indicators.

import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { RoundInfo, RoundStatus } from "../hooks/useSmartFilters";

interface RoundPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  rounds: RoundInfo[];
  selectedRound: string;
  onSelectRound: (round: string) => void;
}

function statusIcon(
  status: RoundStatus
): "lens" | "schedule" | "check-circle" | "radio-button-unchecked" {
  switch (status) {
    case "live":
      return "lens";
    case "unpredicted":
      return "schedule";
    case "settled":
      return "check-circle";
    case "upcoming":
    default:
      return "radio-button-unchecked";
  }
}

export function RoundPickerSheet({
  sheetRef,
  rounds,
  selectedRound,
  onSelectRound,
}: RoundPickerSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const snapPoints = useMemo(() => ["60%", "85%"], []);

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

  const handleSelect = useCallback(
    (round: string) => {
      onSelectRound(round);
      sheetRef.current?.dismiss();
    },
    [onSelectRound, sheetRef]
  );

  const statusLabel = useCallback(
    (status: RoundStatus): string => {
      switch (status) {
        case "live":
          return t("predictions.roundStatus.live", { defaultValue: "Live" });
        case "unpredicted":
          return t("predictions.roundStatus.unpredicted", {
            defaultValue: "To predict",
          });
        case "settled":
          return t("predictions.roundStatus.settled", {
            defaultValue: "Finished",
          });
        case "upcoming":
        default:
          return t("predictions.roundStatus.upcoming", {
            defaultValue: "Upcoming",
          });
      }
    },
    [t]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
    >
      <View style={styles.header}>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("predictions.selectRound", { defaultValue: "Select Round" })}
        </AppText>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      >
        {rounds.map((r) => {
          const isSelected = r.round === selectedRound;
          const iconName = statusIcon(r.status);
          return (
            <Pressable
              key={r.round}
              onPress={() => handleSelect(r.round)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: isSelected
                    ? theme.colors.cardBackground
                    : "transparent",
                  borderLeftColor: isSelected
                    ? theme.colors.primary
                    : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <MaterialIcons
                name={iconName as "check-circle"}
                size={20}
                color={
                  r.status === "live"
                    ? theme.colors.danger
                    : r.status === "unpredicted"
                      ? theme.colors.primary
                      : theme.colors.textSecondary
                }
              />
              <View style={styles.rowText}>
                <AppText
                  variant="body"
                  style={[
                    styles.roundLabel,
                    isSelected && {
                      fontWeight: "600",
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  {t("predictions.roundNumber", {
                    number: r.round,
                    defaultValue: `Round ${r.round}`,
                  })}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {statusLabel(r.status)} · {r.count}{" "}
                  {t("predictions.fixtures", {
                    count: r.count,
                    defaultValue: r.count === 1 ? "game" : "games",
                  })}
                </AppText>
              </View>
              {isSelected && (
                <MaterialIcons
                  name="check"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderLeftWidth: 4,
  },
  rowText: {
    flex: 1,
  },
  roundLabel: {
    marginBottom: 2,
  },
});
