// components/TeamPickerSheet.tsx
// Bottom sheet with scrollable list of teams for filtering.

import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { TeamChip } from "../hooks/useSmartFilters";

interface TeamPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  teams: TeamChip[];
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number | null) => void;
}

export function TeamPickerSheet({
  sheetRef,
  teams,
  selectedTeamId,
  onSelectTeam,
}: TeamPickerSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

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
    (teamId: number | null) => {
      onSelectTeam(teamId);
      sheetRef.current?.dismiss();
    },
    [onSelectTeam, sheetRef]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      maxDynamicContentSize={500}
    >
      <View style={styles.header}>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("predictions.selectTeam", { defaultValue: "Select Team" })}
        </AppText>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      >
        {/* All teams option */}
        <Pressable
          onPress={() => handleSelect(null)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor:
                selectedTeamId === null
                  ? theme.colors.cardBackground
                  : "transparent",
              borderLeftColor:
                selectedTeamId === null
                  ? theme.colors.primary
                  : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.allTeamsIcon,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <MaterialIcons
              name="groups"
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.rowText}>
            <AppText
              variant="body"
              style={[
                styles.teamName,
                selectedTeamId === null && {
                  fontWeight: "600",
                  color: theme.colors.primary,
                },
              ]}
            >
              {t("predictions.allTeams", { defaultValue: "All Teams" })}
            </AppText>
          </View>
          {selectedTeamId === null && (
            <MaterialIcons
              name="check"
              size={24}
              color={theme.colors.primary}
            />
          )}
        </Pressable>

        {/* Individual teams */}
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          return (
            <Pressable
              key={team.id}
              onPress={() => handleSelect(team.id)}
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
              <TeamLogo
                imagePath={team.imagePath}
                teamName={team.name}
                size={32}
              />
              <View style={styles.rowText}>
                <AppText
                  variant="body"
                  style={[
                    styles.teamName,
                    isSelected && {
                      fontWeight: "600",
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  {team.name}
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
    paddingVertical: 12,
    gap: 12,
    borderLeftWidth: 4,
  },
  rowText: {
    flex: 1,
  },
  teamName: {
    marginBottom: 0,
  },
  allTeamsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
