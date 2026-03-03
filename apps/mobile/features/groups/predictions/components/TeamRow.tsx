import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { FixtureItem } from "@/types/common";

type TeamRowProps = {
  team: FixtureItem["homeTeam"] | FixtureItem["awayTeam"];
  teamName: string;
  isWinner: boolean;
  isUpcoming?: boolean;
};

/**
 * Displays team logo and name in a row
 */
function TeamRowInner({ team, teamName, isWinner, isUpcoming }: TeamRowProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.teamRow}>
      <View style={styles.teamSection}>
        <TeamLogo imagePath={team?.imagePath} teamName={teamName} size={20} rounded={false} />
        <AppText
          variant="body"
          style={[
            styles.teamName,
            { color: isUpcoming ? theme.colors.textPrimary : theme.colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {teamName}
        </AppText>
      </View>
    </View>
  );
}

export const TeamRow = React.memo(TeamRowInner);

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
    gap: 10,
    minWidth: 0,
    height: 26,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    minWidth: 0,
  },
});
