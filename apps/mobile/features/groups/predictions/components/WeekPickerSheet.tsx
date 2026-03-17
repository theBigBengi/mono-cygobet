// components/WeekPickerSheet.tsx
import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTheme } from "@/lib/theme";
import type { WeekInfo, TeamChip } from "../hooks/useSmartFilters";

type ActionPill = { id: string; label: string };

const ACTION_PILLS: ActionPill[] = [
  { id: "all", label: "All" },
  { id: "predict", label: "To Predict" },
  { id: "results", label: "Results" },
];

interface WeekPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  weeks: WeekInfo[];
  selectedWeek: string;
  onSelectWeek: (weekKey: string) => void;
  selectedAction?: string;
  onSelectAction?: (action: string) => void;
  teams?: TeamChip[];
  selectedTeamId?: number | null;
  onSelectTeam?: (id: number | null) => void;
}

export function WeekPickerSheet({
  sheetRef,
  weeks,
  selectedWeek,
  onSelectWeek,
  selectedAction,
  onSelectAction,
  teams,
  selectedTeamId,
  onSelectTeam,
}: WeekPickerSheetProps) {
  const { theme } = useTheme();

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
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
    (weekKey: string) => {
      onSelectWeek(weekKey);
      sheetRef.current?.dismiss();
    },
    [onSelectWeek, sheetRef]
  );

  const handleSelectAction = useCallback(
    (action: string) => {
      onSelectAction?.(action);
      sheetRef.current?.dismiss();
    },
    [onSelectAction, sheetRef]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary + "40", width: 32 }}
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
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.textSecondary + "10",
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
        {teams && teams.length > 0 && onSelectTeam && (
          <View style={styles.pillRow}>
            <Pressable
              onPress={() => { onSelectTeam(null); sheetRef.current?.dismiss(); }}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: selectedTeamId == null ? theme.colors.primary : theme.colors.textSecondary + "10",
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[
                styles.pillText,
                { color: selectedTeamId == null ? theme.colors.textInverse : theme.colors.textSecondary },
              ]}>
                All Teams
              </Text>
            </Pressable>
            {teams.map((team) => {
              const isActive = team.id === selectedTeamId;
              return (
                <Pressable
                  key={team.id}
                  onPress={() => { onSelectTeam(team.id); sheetRef.current?.dismiss(); }}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.textSecondary + "10",
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[
                    styles.pillText,
                    { color: isActive ? theme.colors.textInverse : theme.colors.textSecondary },
                  ]}>
                    {team.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {weeks.map((w) => {
          const isSelected = w.key === selectedWeek;
          const isSettled = w.status === "settled";
          const textColor = isSelected
            ? theme.colors.primary
            : isSettled
              ? theme.colors.textSecondary
              : theme.colors.textPrimary;
          return (
            <Pressable
              key={w.key}
              onPress={() => handleSelect(w.key)}
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
                ) : (w.status === "upcoming" || w.status === "unpredicted") ? (
                  <Ionicons name="stopwatch-outline" size={16} color={textColor + "90"} />
                ) : null}
                <Text style={[
                  styles.rowText,
                  { color: textColor },
                  isSelected && { fontWeight: "600" },
                ]}>
                  {w.label}
                </Text>
              </View>
              <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                {w.predictedCount}/{w.count}
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowText: {
    fontSize: 14,
    fontWeight: "500",
  },
  countText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
