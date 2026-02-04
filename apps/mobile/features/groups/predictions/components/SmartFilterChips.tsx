// components/SmartFilterChips.tsx
// Two-layer smart filters: Layer 1 action chips (single-select), Layer 2 structural (teams/rounds).

import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { HEADER_HEIGHT } from "../utils/constants";
import { RoundNavigator } from "./RoundNavigator";
import { RoundPickerSheet } from "./RoundPickerSheet";
import { TeamAvatarChips } from "./TeamAvatarChips";
import type { ActionChip, StructuralFilter } from "../hooks/useSmartFilters";

const AMBER = "#F59E0B";
const RED = "#EF4444";
const MUTED = "#9CA3AF";

interface SmartFilterChipsProps {
  actionChips: ActionChip[];
  selectedAction: string;
  onSelectAction: (id: string) => void;
  structuralFilter: StructuralFilter | null;
  onSelectTeam: (teamId: number | null) => void;
  onSelectRound: (round: string) => void;
  onNavigateRound: (direction: "prev" | "next") => void;
}

export function SmartFilterChips({
  actionChips,
  selectedAction,
  onSelectAction,
  structuralFilter,
  onSelectTeam,
  onSelectRound,
  onNavigateRound,
}: SmartFilterChipsProps) {
  const { theme } = useTheme();
  const [roundPickerVisible, setRoundPickerVisible] = useState(false);

  const isLiveChip = (id: string) => id === "live";
  const isPredictChip = (id: string) => id === "predict";
  const isResultsChip = (id: string) => id === "results";
  const isUrgentPredict = (chip: ActionChip) =>
    isPredictChip(chip.id) &&
    (chip.urgency === "urgent" || chip.urgency === "critical");

  if (actionChips.length === 0) {
    return null;
  }

  const hasStructuralFilter = structuralFilter != null;
  const roundsFilter =
    structuralFilter?.type === "rounds" ? structuralFilter : null;
  const teamsFilter =
    structuralFilter?.type === "teams" ? structuralFilter : null;

  let canGoPrev = false;
  let canGoNext = false;
  if (roundsFilter) {
    const rounds = roundsFilter.allRounds.map((r) => r.round);
    const idx = rounds.indexOf(roundsFilter.selectedRound);
    canGoPrev = idx > 0;
    canGoNext = idx >= 0 && idx < rounds.length - 1;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionRow}
        style={styles.actionRowScroll}
      >
        {actionChips.map((chip) => {
          const isActive = selectedAction === chip.id;
          const live = isLiveChip(chip.id);
          const predict = isPredictChip(chip.id);
          const results = isResultsChip(chip.id);
          const urgent = isUrgentPredict(chip);
          const warning = predict && chip.urgency === "warning";

          let bgColor = theme.colors.cardBackground;
          let borderColor = theme.colors.border;
          let textColor = theme.colors.textSecondary;
          if (isActive) {
            if (live || urgent) {
              bgColor = RED;
              borderColor = RED;
              textColor = "#fff";
            } else if (predict && !urgent) {
              bgColor = AMBER;
              borderColor = AMBER;
              textColor = "#fff";
            } else if (results) {
              bgColor = theme.colors.cardBackground;
              borderColor = theme.colors.border;
              textColor = MUTED;
            } else {
              bgColor = theme.colors.primary;
              borderColor = theme.colors.primary;
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
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: bgColor,
                    borderColor,
                    borderWidth: 1,
                  },
                ]}
              >
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
                    size={14}
                    color="#fff"
                    style={styles.chipIcon}
                  />
                )}
                <AppText
                  variant="caption"
                  style={[
                    styles.chipText,
                    { color: textColor },
                    urgent && isActive && styles.chipTextBold,
                  ]}
                  numberOfLines={1}
                >
                  {chip.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {teamsFilter && (
        <TeamAvatarChips
          teams={teamsFilter.teams}
          selectedTeamId={teamsFilter.selectedTeamId}
          onSelectTeam={onSelectTeam}
        />
      )}

      {roundsFilter && (
        <>
          <RoundNavigator
            selectedRound={roundsFilter.selectedRound}
            onPrev={() => onNavigateRound("prev")}
            onNext={() => onNavigateRound("next")}
            onOpenPicker={() => setRoundPickerVisible(true)}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
          />
          <RoundPickerSheet
            visible={roundPickerVisible}
            onClose={() => setRoundPickerVisible(false)}
            rounds={roundsFilter.allRounds}
            selectedRound={roundsFilter.selectedRound}
            onSelectRound={onSelectRound}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  actionRowScroll: {
    flexGrow: 0,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 12,
  },
  chipWrap: {
    borderRadius: 20,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipTextBold: {
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
