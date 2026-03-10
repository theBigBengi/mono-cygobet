// components/SmartFilterChips.tsx
// Minimal, sleek filter chips. Single flow layout, no labels, no dividers.

import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
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

  const isRoundFilterActive =
    roundsFilter != null && selectedAction === "round";

  const handleRoundPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRoundFilterActive) {
      roundPickerRef.current?.present();
    } else if (roundsFilter) {
      onSelectRound(roundsFilter.selectedRound);
    }
  }, [isRoundFilterActive, roundsFilter, onSelectRound]);

  const handleTeamPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    teamPickerRef.current?.present();
  }, []);

  const handleCompetitionPillPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    competitionPickerRef.current?.present();
  }, []);

  const handleActionPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectAction(id);
  }, [onSelectAction]);

  if (actionChips.length === 0 && !roundsFilter && !teamsFilter) {
    return null;
  }

  const selectedTeam = teamsFilter?.teams.find(
    (t) => t.id === teamsFilter.selectedTeamId
  );
  const selectedCompetition = teamsFilter?.competitions.find(
    (c) => c.id === teamsFilter.selectedCompetitionId
  );
  const teamPillActive = teamsFilter?.selectedTeamId != null;
  const competitionPillActive = teamsFilter?.selectedCompetitionId != null;

  // Shared chip style helpers
  const inactiveBg = theme.colors.textSecondary + "12";
  const inactiveText = theme.colors.textSecondary;
  const activeBg = theme.colors.primary;
  const activeText = theme.colors.textInverse;

  return (
    <View style={styles.container}>
      {/* Round chips — horizontal scroll for leagues mode */}
      {roundsFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roundsScroll}
          style={styles.roundsRow}
        >
          {roundsFilter.allRounds.map((r) => {
            const isSelected = isRoundFilterActive && roundsFilter.selectedRound === r.round;
            const isLiveRound = r.status === "live";
            const isUnpredicted = r.status === "unpredicted";

            let bg = inactiveBg;
            let text = inactiveText;
            if (isSelected) {
              bg = isLiveRound ? theme.colors.live : activeBg;
              text = activeText;
            }

            return (
              <Pressable
                key={r.round}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectRound(r.round);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                {isLiveRound && (
                  <View style={[styles.dot, { backgroundColor: isSelected ? activeText : theme.colors.live }]} />
                )}
                <AppText
                  variant="caption"
                  style={[styles.chipText, { color: text }]}
                  numberOfLines={1}
                >
                  {r.round}
                </AppText>
                {isUnpredicted && !isSelected && (
                  <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Action + structural chips — single wrapping row */}
      <View style={styles.chipsRow}>
        {/* Team pill */}
        {teamsFilter && (
          <Pressable
            onPress={handleTeamPillPress}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: teamPillActive ? activeBg : inactiveBg, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.chipText, { color: teamPillActive ? activeText : inactiveText }]}
              numberOfLines={1}
            >
              {selectedTeam?.name ?? t("predictions.allTeams", { defaultValue: "All Teams" })}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={10}
              color={teamPillActive ? activeText : inactiveText}
              style={styles.chevron}
            />
          </Pressable>
        )}

        {/* Competition pill */}
        {teamsFilter && teamsFilter.competitions.length > 1 && (
          <Pressable
            onPress={handleCompetitionPillPress}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: competitionPillActive ? activeBg : inactiveBg, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.chipText, { color: competitionPillActive ? activeText : inactiveText }]}
              numberOfLines={1}
            >
              {selectedCompetition?.name ?? t("predictions.allCompetitions", { defaultValue: "All Competitions" })}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={10}
              color={competitionPillActive ? activeText : inactiveText}
              style={styles.chevron}
            />
          </Pressable>
        )}

        {/* Action chips */}
        {actionChips.map((chip) => {
          const hasStructuralFilter = teamPillActive || competitionPillActive;
          const isActive =
            selectedAction === chip.id &&
            !(chip.id === "all" && hasStructuralFilter);
          const isLive = chip.id === "live";
          const isPredict = chip.id === "predict";
          const isUrgent = isPredict && (chip.urgency === "urgent" || chip.urgency === "critical");

          let bg = inactiveBg;
          let text = inactiveText;
          if (isActive) {
            if (isLive || isUrgent) {
              bg = theme.colors.live;
            } else if (isPredict) {
              bg = theme.colors.warning;
            } else {
              bg = activeBg;
            }
            text = activeText;
          }

          return (
            <Pressable
              key={chip.id}
              onPress={() => handleActionPress(chip.id)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {isLive && (
                <View style={[styles.dot, { backgroundColor: isActive ? activeText : theme.colors.live }]} />
              )}
              <AppText
                variant="caption"
                style={[styles.chipText, { color: text }]}
                numberOfLines={1}
              >
                {chip.label}
              </AppText>
            </Pressable>
          );
        })}

        {/* Round pill for leagues mode */}
        {roundsFilter && (
          <Pressable
            onPress={handleRoundPillPress}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: isRoundFilterActive ? activeBg : inactiveBg, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.chipText, { color: isRoundFilterActive ? activeText : inactiveText }]}
              numberOfLines={1}
            >
              {t("predictions.roundNumber", {
                number: roundsFilter.selectedRound,
                defaultValue: `R${roundsFilter.selectedRound}`,
              })}
            </AppText>
            {isRoundFilterActive && (
              <Ionicons name="chevron-down" size={10} color={activeText} style={styles.chevron} />
            )}
          </Pressable>
        )}
      </View>

      {/* Picker sheets */}
      {roundsFilter && (
        <RoundPickerSheet
          sheetRef={roundPickerRef}
          rounds={roundsFilter.allRounds}
          selectedRound={roundsFilter.selectedRound}
          onSelectRound={onSelectRound}
        />
      )}
      {teamsFilter && (
        <TeamPickerSheet
          sheetRef={teamPickerRef}
          teams={teamsFilter.teams}
          selectedTeamId={teamsFilter.selectedTeamId}
          onSelectTeam={onSelectTeam}
        />
      )}
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
    gap: 10,
  },
  roundsRow: {
    flexGrow: 0,
    marginHorizontal: -20,
  },
  roundsScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chevron: {
    marginStart: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginEnd: 5,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginStart: 4,
  },
});
