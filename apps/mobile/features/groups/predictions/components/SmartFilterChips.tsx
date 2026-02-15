// components/SmartFilterChips.tsx
// Two-layer smart filters: Layer 1 action chips (single-select), Layer 2 structural (teams/rounds).

import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { RoundPickerSheet } from "./RoundPickerSheet";
import { TeamPickerSheet } from "./TeamPickerSheet";
import { CompetitionPickerSheet } from "./CompetitionPickerSheet";
import type { ActionChip, StructuralFilter } from "../hooks/useSmartFilters";

const AMBER = "#F59E0B";
const RED = "#EF4444";

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
    if (isRoundFilterActive) {
      roundPickerRef.current?.present();
    } else if (roundsFilter) {
      onSelectRound(roundsFilter.selectedRound);
    }
  }, [isRoundFilterActive, roundsFilter, onSelectRound]);

  // Handle team pill press - always open picker
  const handleTeamPillPress = useCallback(() => {
    teamPickerRef.current?.present();
  }, []);

  // Handle competition pill press - always open picker
  const handleCompetitionPillPress = useCallback(() => {
    competitionPickerRef.current?.present();
  }, []);

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRow}
        style={styles.actionRowScroll}
      >
        {/* Team pill for teams mode */}
        {teamsFilter && (
          <Pressable
            onPress={handleTeamPillPress}
            style={({ pressed }) => [
              styles.chipWrap,
              pressed && styles.chipPressed,
            ]}
          >
            <View
              style={[
                styles.chip,
                teamPillActive && styles.pillActive,
                {
                  backgroundColor: teamPillActive
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  teamPillActive && styles.chipTextActive,
                  {
                    color: teamPillActive
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
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
                    ? theme.colors.primaryText
                    : theme.colors.textSecondary
                }
                style={styles.pillChevron}
              />
            </View>
          </Pressable>
        )}

        {/* Competition pill for teams mode */}
        {teamsFilter && teamsFilter.competitions.length > 1 && (
          <Pressable
            onPress={handleCompetitionPillPress}
            style={({ pressed }) => [
              styles.chipWrap,
              pressed && styles.chipPressed,
            ]}
          >
            <View
              style={[
                styles.chip,
                competitionPillActive && styles.pillActive,
                {
                  backgroundColor: competitionPillActive
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  competitionPillActive && styles.chipTextActive,
                  {
                    color: competitionPillActive
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
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
                    ? theme.colors.primaryText
                    : theme.colors.textSecondary
                }
                style={styles.pillChevron}
              />
            </View>
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

          // Determine colors based on state
          let bgColor = theme.colors.border;
          let textColor = theme.colors.textSecondary;
          if (isActive) {
            if (live || urgent) {
              bgColor = RED;
              textColor = "#fff";
            } else if (predict && !urgent) {
              bgColor = AMBER;
              textColor = "#fff";
            } else {
              bgColor = theme.colors.primary;
              textColor = theme.colors.primaryText;
            }
          }

          return (
            <Pressable
              key={chip.id}
              onPress={() => onSelectAction(chip.id)}
              style={({ pressed }) => [
                styles.chipWrap,
                pressed && styles.chipPressed,
              ]}
            >
              <View style={[styles.chip, { backgroundColor: bgColor }]}>
                {live && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isActive ? "#fff" : RED },
                    ]}
                  />
                )}
                {warning && isActive && (
                  <MaterialIcons
                    name="warning"
                    size={12}
                    color="#fff"
                    style={styles.chipIcon}
                  />
                )}
                <AppText
                  variant="caption"
                  style={[
                    styles.chipText,
                    { color: textColor },
                    isActive && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {chip.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        {/* Round pill for leagues mode - after action chips */}
        {roundsFilter && (
          <Pressable
            onPress={handleRoundPillPress}
            style={({ pressed }) => [
              styles.chipWrap,
              pressed && styles.chipPressed,
            ]}
          >
            <View
              style={[
                styles.chip,
                isRoundFilterActive && styles.pillActive,
                {
                  backgroundColor: isRoundFilterActive
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={[
                  styles.chipText,
                  isRoundFilterActive && styles.chipTextActive,
                  {
                    color: isRoundFilterActive
                      ? theme.colors.primaryText
                      : theme.colors.textSecondary,
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
                  color={theme.colors.primaryText}
                  style={styles.pillChevron}
                />
              )}
            </View>
          </Pressable>
        )}
      </ScrollView>

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
    flexDirection: "row",
    alignItems: "center",
  },
  actionRowScroll: {
    flexGrow: 0,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipWrap: {
    borderRadius: 8,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pillActive: {
    paddingEnd: 8,
  },
  pillChevron: {
    marginStart: 2,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  chipTextActive: {
    fontWeight: "600",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
