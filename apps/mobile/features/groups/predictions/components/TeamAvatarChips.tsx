// components/TeamAvatarChips.tsx
// Horizontal row of team avatar bubbles (32px). Single-select: tap to filter, tap again to clear.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { TeamChip } from "../hooks/useSmartFilters";

interface TeamAvatarChipsProps {
  teams: TeamChip[];
  selectedTeamId: number | null;
  onSelectTeam: (teamId: number | null) => void;
}

export function TeamAvatarChips({
  teams,
  selectedTeamId,
  onSelectTeam,
}: TeamAvatarChipsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      {teams.map((team) => {
        const isSelected = selectedTeamId === team.id;
        return (
          <Pressable
            key={team.id}
            onPress={() => onSelectTeam(isSelected ? null : team.id)}
            style={[
              styles.avatarWrap,
              {
                borderWidth: 2,
                borderColor: isSelected ? theme.colors.primary : "transparent",
              },
            ]}
          >
            <TeamLogo
              imagePath={team.imagePath}
              teamName={team.name}
              size={32}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  avatarWrap: {
    borderRadius: 18,
    padding: 2,
  },
});
