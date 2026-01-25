// features/group-games-selection/components/SelectedGameCard.tsx
// Card component for displaying a selected game in the modal.
// Shows date, time, team names with logos, and empty score boxes.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiFixturesListResponse } from "@repo/types";
import { formatKickoffTime, getTeamDisplayName } from "@/utils/fixture";

type FixtureItem = ApiFixturesListResponse["data"][0];

interface SelectedGameCardProps {
  fixture: FixtureItem;
}

function formatGameDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  try {
    const date = new Date(iso);
    const weekday = date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${weekday}, ${day}.${month}.${year}`;
  } catch {
    return "—";
  }
}

export function SelectedGameCard({ fixture }: SelectedGameCardProps) {
  const { theme } = useTheme();
  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");
  const kickoffTime = formatKickoffTime(fixture.kickoffAt);
  const gameDate = formatGameDate(fixture.kickoffAt);

  return (
    <View style={styles.container}>
      {/* Date and Time */}
      <View style={styles.dateTimeRow}>
        <AppText variant="body" style={styles.dateText}>
          {gameDate}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.timeText}>
          {kickoffTime}
        </AppText>
      </View>

      {/* Teams and Score Boxes */}
      <View
        style={[
          styles.teamsContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* Home Team Row */}
        <View style={styles.teamRow}>
          <TeamLogo
            imagePath={fixture.homeTeam?.imagePath}
            teamName={homeTeamName}
            size={28}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={1}>
            {homeTeamName}
          </AppText>
          <View
            style={[styles.scoreBox, { borderColor: theme.colors.border }]}
          />
          <AppText variant="body" style={styles.scoreSeparator}>
            :
          </AppText>
          <View
            style={[styles.scoreBox, { borderColor: theme.colors.border }]}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={1}>
            {awayTeamName}
          </AppText>
          <TeamLogo
            imagePath={fixture.awayTeam?.imagePath}
            teamName={awayTeamName}
            size={28}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateText: {
    fontWeight: "600",
  },
  timeText: {
    fontSize: 14,
  },
  teamsContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  teamName: {
    flex: 1,
  },
  scoreBox: {
    width: 40,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  scoreSeparator: {
    marginHorizontal: 4,
    fontSize: 18,
    fontWeight: "600",
  },
});
