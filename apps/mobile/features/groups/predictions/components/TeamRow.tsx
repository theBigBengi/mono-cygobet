import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import type { FixtureItem } from "@/types/common";

type TeamRowProps = {
  team: FixtureItem["homeTeam"] | FixtureItem["awayTeam"];
  teamName: string;
  isWinner: boolean;
};

/**
 * Displays team logo and name in a row
 */
export function TeamRow({ team, teamName, isWinner }: TeamRowProps) {
  return (
    <View style={styles.teamRow}>
      <View style={styles.teamSection}>
        <TeamLogo imagePath={team?.imagePath} teamName={teamName} size={32} rounded={false} />
        <AppText
          variant="body"
          style={[styles.teamName, isWinner && styles.winnerTeamName]}
          numberOfLines={1}
        >
          {teamName}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },
  teamSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    height: 36,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    minWidth: 0,
  },
  winnerTeamName: {
    fontWeight: "700",
  },
});
