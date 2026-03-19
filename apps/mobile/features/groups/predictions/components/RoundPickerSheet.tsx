// components/RoundPickerSheet.tsx
import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTheme, spacing, radius } from "@/lib/theme";
import type { RoundInfo } from "../hooks/useSmartFilters";

type ActionPill = { id: string; label: string };

const ACTION_PILLS: ActionPill[] = [
  { id: "all", label: "All" },
  { id: "predict", label: "To Predict" },
  { id: "results", label: "Results" },
];

interface RoundPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  rounds: RoundInfo[];
  selectedRound: string;
  onSelectRound: (round: string) => void;
  selectedAction?: string;
  onSelectAction?: (action: string) => void;
}

export function RoundPickerSheet({
  sheetRef,
  rounds,
  selectedRound,
  onSelectRound,
  selectedAction,
  onSelectAction,
}: RoundPickerSheetProps) {
  const { theme } = useTheme();

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
    }),
    [theme.colors.surfaceElevated]
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

  const handleSelectAction = useCallback(
    (action: string) => {
      onSelectAction?.(action);
      sheetRef.current?.dismiss();
    },
    [onSelectAction, sheetRef]
  );

  const isActionMode = selectedAction && selectedAction !== "round";

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textDisabled, width: 32 }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {onSelectAction && (
          <View style={styles.pillRow}>
            {ACTION_PILLS.map((pill) => {
              const isActive = pill.id === selectedAction;
              return (
                <Pressable
                  key={pill.id}
                  onPress={() => handleSelectAction(pill.id)}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.cardBackground,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    { color: isActive ? theme.colors.textInverse : theme.colors.textSecondary },
                  ]}>
                    {pill.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {rounds.map((r) => {
          const isSelected = r.round === selectedRound;
          const isSettled = r.status === "settled";
          const textColor = isSelected
            ? theme.colors.primary
            : isSettled
              ? theme.colors.textSecondary
              : theme.colors.textPrimary;
          return (
            <Pressable
              key={r.round}
              onPress={() => handleSelect(r.round)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: isSelected ? theme.colors.primary + "10" : "transparent",
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                {isSettled ? (
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.textSecondary + "80"} />
                ) : (r.status === "upcoming" || r.status === "unpredicted") ? (
                  <Ionicons name="stopwatch-outline" size={16} color={textColor + "90"} />
                ) : null}
                <Text style={[
                  styles.roundText,
                  { color: textColor },
                  isSelected && { fontWeight: "600" },
                ]}>
                  Round {r.round}
                </Text>
              </View>
              <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                {r.predictedCount}/{r.count}
              </Text>
            </Pressable>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.ms,
    paddingHorizontal: spacing.xs,
  },
  pill: {
    paddingVertical: radius.xs,
    paddingHorizontal: radius.md,
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: radius.sm,
    paddingHorizontal: spacing.ms,
    borderRadius: radius.md,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: radius.xs,
  },
  roundText: {
    fontSize: 14,
    fontWeight: "500",
  },
  countText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
