// components/TeamAvatarChips.tsx
// Horizontal row of team avatar bubbles (32px). Single-select: tap to filter, tap again to clear.

import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        // { borderTopColor: theme.colors.border },
      ]}
      style={styles.scroll}
    >
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
              size={24}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    // borderTopWidth: 1,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    // paddingRight: 12,
    // backgroundColor: "red",
  },
  avatarWrap: {
    borderRadius: 18,
    padding: 2,
  },
});
