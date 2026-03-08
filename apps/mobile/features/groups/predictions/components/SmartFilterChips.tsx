// components/SmartFilterChips.tsx
// Two-layer smart filters: Layer 1 action chips (single-select), Layer 2 structural (teams/rounds).

import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { RoundPickerSheet } from "./RoundPickerSheet";
import { TeamPickerSheet } from "./TeamPickerSheet";
import { CompetitionPickerSheet } from "./CompetitionPickerSheet";
import type { ActionChip, StructuralFilter } from "../hooks/useSmartFilters";

interface SmartFilterChipsProps {
  actionChips: ActionChip[];
  selectedAction: string;
  onSelectAction: (id: string) => void;
  structuralFilter: StructuralFilter | null;
  onSelectTeam: (teamId: number | null) => void;
  onSelectCompetition: (competitionId: number | null) => void;
  onSelectRound: (round: string) => void;
  onNavigateRound: (direction: "prev" | "next") => void;
}

export function SmartFilterChips({
  actionChips,
  selectedAction,
  onSelectAction,
  structuralFilter,
  onSelectTeam,
  onSelectCompetition,
  onSelectRound,
  onNavigateRound: _onNavigateRound,
}: SmartFilterChipsProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const roundPickerRef = useRef<BottomSheetModal>(null);
  const teamPickerRef = useRef<BottomSheetModal>(null);
  const competitionPickerRef = useRef<BottomSheetModal>(null);

  const roundsFilter =
    structuralFilter?.type === "rounds" ? structuralFilter : null;
  const teamsFilter =
    structuralFilter?.type === "teams" ? structuralFilter : null;

  // Check if round filter is active (selectedAction is "round")
  const isRoundFilterActive =
    roundsFilter != null && selectedAction === "round";

  // Handle round pill press: select round if not active, open picker if active
  const handleRoundPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRoundFilterActive) {
      roundPickerRef.current?.present();
    } else if (roundsFilter) {
      onSelectRound(roundsFilter.selectedRound);
    }
  }, [isRoundFilterActive, roundsFilter, onSelectRound]);

  // Handle team pill press - always open picker
  const handleTeamPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    teamPickerRef.current?.present();
  }, []);

  // Handle competition pill press - always open picker
  const handleCompetitionPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    competitionPickerRef.current?.present();
  }, []);

  // Handle action chip press
  const handleActionPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectAction(id);
  }, [onSelectAction]);

  const isLiveChip = (id: string) => id === "live";
  const isPredictChip = (id: string) => id === "predict";
  const isUrgentPredict = (chip: ActionChip) =>
    isPredictChip(chip.id) &&
    (chip.urgency === "urgent" || chip.urgency === "critical");

  if (actionChips.length === 0 && !roundsFilter && !teamsFilter) {
    return null;
  }

  // Get selected team/competition names for pills
  const selectedTeam = teamsFilter?.teams.find(
    (t) => t.id === teamsFilter.selectedTeamId
  );
  const selectedCompetition = teamsFilter?.competitions.find(
    (c) => c.id === teamsFilter.selectedCompetitionId
  );

  // Determine if pills are "active" (showing filtered state)
  const teamPillActive = teamsFilter?.selectedTeamId != null;
  const competitionPillActive = teamsFilter?.selectedCompetitionId != null;

  return (
    <View style={styles.container}>
      {/* Round chips row for leagues mode — shown above action chips */}
      {roundsFilter && (
        <View style={styles.roundChipsSection}>
          <AppText variant="caption" style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
            {t("predictions.roundLabel", { defaultValue: "Round" })}
          </AppText>
          <View style={styles.roundChipsRow}>
            {roundsFilter.allRounds.map((r) => {
              const isSelected = isRoundFilterActive && roundsFilter.selectedRound === r.round;
              const isLiveRound = r.status === "live";
              const isUnpredicted = r.status === "unpredicted";

              let bgColor = theme.colors.textSecondary + "20";
              let textCol = theme.colors.textPrimary + "90";

              if (isSelected) {
                if (isLiveRound) {
                  bgColor = theme.colors.live;
                  textCol = theme.colors.textInverse;
                } else {
                  bgColor = theme.colors.primary;
                  textCol = theme.colors.textInverse;
                }
              }

              return (
                <Pressable
                  key={r.round}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelectRound(r.round);
                  }}
                  style={({ pressed }) => [
                    styles.roundChip,
                    {
                      backgroundColor: bgColor,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                  ]}
                >
                  {isLiveRound && !isSelected && (
                    <View style={[styles.dot, { backgroundColor: theme.colors.live }]} />
                  )}
                  {isLiveRound && isSelected && (
                    <View style={[styles.dot, { backgroundColor: theme.colors.textInverse }]} />
                  )}
                  <AppText
                    variant="caption"
                    style={[
                      styles.roundChipText,
                      { color: textCol },
                      isSelected && styles.chipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {r.round}
                  </AppText>
                  {isUnpredicted && !isSelected && (
                    <View style={[styles.unpredictedDot, { backgroundColor: theme.colors.warning }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Divider between round section and filter section */}
      {roundsFilter && actionChips.length > 0 && (
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      )}

      {/* Section label for filters */}
      {actionChips.length > 0 && (
        <AppText variant="caption" style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
          {t("predictions.filterLabel", { defaultValue: "Filter" })}
        </AppText>
      )}

      <View style={styles.actionRow}>
        {/* Team pill for teams mode */}
        {teamsFilter && (
          <Pressable
            onPress={handleTeamPillPress}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: teamPillActive
                  ? theme.colors.primary
                  : theme.colors.textSecondary + "20",
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.chipText,
                {
                  color: teamPillActive
                    ? theme.colors.textInverse
                    : theme.colors.textPrimary + "90",
                },
              ]}
              numberOfLines={1}
            >
              {selectedTeam?.name ??
                t("predictions.allTeams", { defaultValue: "All Teams" })}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={
                teamPillActive
                  ? theme.colors.textInverse
                  : theme.colors.textPrimary + "90"
              }
              style={styles.pillChevron}
            />
          </Pressable>
        )}

        {/* Competition pill for teams mode */}
        {teamsFilter && teamsFilter.competitions.length > 1 && (
          <Pressable
            onPress={handleCompetitionPillPress}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: competitionPillActive
                  ? theme.colors.primary
                  : theme.colors.textSecondary + "20",
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.chipText,
                {
                  color: competitionPillActive
                    ? theme.colors.textInverse
                    : theme.colors.textPrimary + "90",
                },
              ]}
              numberOfLines={1}
            >
              {selectedCompetition?.name ??
                t("predictions.allCompetitions", {
                  defaultValue: "All Competitions",
                })}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={
                competitionPillActive
                  ? theme.colors.textInverse
                  : theme.colors.textPrimary + "90"
              }
              style={styles.pillChevron}
            />
          </Pressable>
        )}

        {/* Action chips */}
        {actionChips.map((chip) => {
          // Don't highlight "all" when team or competition filter is active
          const hasStructuralFilter = teamPillActive || competitionPillActive;
          const isActive =
            selectedAction === chip.id &&
            !(chip.id === "all" && hasStructuralFilter);
          const live = isLiveChip(chip.id);
          const predict = isPredictChip(chip.id);
          const urgent = isUrgentPredict(chip);
          const warning = predict && chip.urgency === "warning";

          // Determine colors — pill style (no border, bg only)
          let bgColor = theme.colors.textSecondary + "20";
          let textColor = theme.colors.textPrimary + "90";
          if (isActive) {
            if (live || urgent) {
              bgColor = theme.colors.live;
              textColor = theme.colors.textInverse;
            } else if (predict && !urgent) {
              bgColor = theme.colors.warning;
              textColor = theme.colors.textInverse;
            } else {
              bgColor = theme.colors.primary;
              textColor = theme.colors.textInverse;
            }
          }

          return (
            <Pressable
              key={chip.id}
              onPress={() => handleActionPress(chip.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: bgColor,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              {live && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isActive ? theme.colors.textInverse : theme.colors.live },
                  ]}
                />
              )}
              {warning && isActive && (
                <MaterialIcons
                  name="warning"
                  size={12}
                  color={theme.colors.textInverse}
                  style={styles.chipIcon}
                />
              )}
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  { color: textColor },
                ]}
                numberOfLines={1}
              >
                {chip.label}
              </AppText>
            </Pressable>
          );
        })}

        {/* Round pill for leagues mode - after action chips */}
        {roundsFilter && (
          <Pressable
            onPress={handleRoundPillPress}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isRoundFilterActive
                  ? theme.colors.primary
                  : theme.colors.textSecondary + "20",
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[
                styles.chipText,
                {
                  color: isRoundFilterActive
                    ? theme.colors.textInverse
                    : theme.colors.textPrimary + "90",
                },
              ]}
              numberOfLines={1}
            >
              {t("predictions.roundNumber", {
                number: roundsFilter.selectedRound,
                defaultValue: `Round ${roundsFilter.selectedRound}`,
              })}
            </AppText>
            {isRoundFilterActive && (
              <Ionicons
                name="chevron-down"
                size={12}
                color={theme.colors.textInverse}
                style={styles.pillChevron}
              />
            )}
          </Pressable>
        )}
      </View>

      {/* Round picker sheet */}
      {roundsFilter && (
        <RoundPickerSheet
          sheetRef={roundPickerRef}
          rounds={roundsFilter.allRounds}
          selectedRound={roundsFilter.selectedRound}
          onSelectRound={onSelectRound}
        />
      )}

      {/* Team picker sheet */}
      {teamsFilter && (
        <TeamPickerSheet
          sheetRef={teamPickerRef}
          teams={teamsFilter.teams}
          selectedTeamId={teamsFilter.selectedTeamId}
          onSelectTeam={onSelectTeam}
        />
      )}

      {/* Competition picker sheet */}
      {teamsFilter && (
        <CompetitionPickerSheet
          sheetRef={competitionPickerRef}
          competitions={teamsFilter.competitions}
          selectedCompetitionId={teamsFilter.selectedCompetitionId}
          onSelectCompetition={onSelectCompetition}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillChevron: {
    marginStart: 4,
  },
  chipIcon: {
    marginEnd: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 6,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  roundChipsSection: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  roundChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roundChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 36,
    justifyContent: "center",
  },
  roundChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  unpredictedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginStart: 4,
  },
});
