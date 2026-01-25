import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffTime, getTeamDisplayName } from "@/utils/fixture";
import type { FixtureItem } from "../types";

interface GroupLobbyFixtureCardProps {
  /**
   * Fixture data to display
   */
  fixture: FixtureItem;
}

/**
 * Component for displaying a single fixture card.
 * Extracted from GroupFixtureRow in the original file.
 * Shows teams, logos, date, and time.
 */
export function GroupLobbyFixtureCard({
  fixture,
}: GroupLobbyFixtureCardProps) {
  const { theme } = useTheme();
  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");
  const kickoffTime = formatKickoffTime(fixture.kickoffAt);

  // Format date label (DD.MM.YY)
  let dateLabel = "";
  if (fixture.kickoffAt) {
    try {
      const d = new Date(fixture.kickoffAt);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = String(d.getFullYear()).slice(-2);
      dateLabel = `${day}.${month}.${year}`;
    } catch {
      dateLabel = "";
    }
  }

  return (
    <View
      style={[
        styles.gameRowContainer,
        {
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View style={styles.gameHeaderRow}>
        <AppText variant="caption" color="secondary">
          {fixture.league?.name || "Unknown league"}
        </AppText>
        <AppText variant="caption" color="secondary">
          {dateLabel} {kickoffTime}
        </AppText>
      </View>

      <View style={styles.gameLogosRow}>
        <View style={styles.gameTeamLogoBlock}>
          <TeamLogo
            imagePath={fixture.homeTeam?.imagePath}
            teamName={homeTeamName}
            size={56}
          />
          <AppText variant="body" style={styles.gameTeamName} numberOfLines={1}>
            {homeTeamName}
          </AppText>
        </View>

        {/* Prediction Score Display */}
        <View style={styles.scoreContainer}>
          <AppText variant="body" style={styles.scoreText}>
            {fixture.prediction?.home !== null && fixture.prediction?.home !== undefined
              ? fixture.prediction.home
              : "—"}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.scoreSeparator}>
            {" : "}
          </AppText>
          <AppText variant="body" style={styles.scoreText}>
            {fixture.prediction?.away !== null && fixture.prediction?.away !== undefined
              ? fixture.prediction.away
              : "—"}
          </AppText>
        </View>

        <View style={styles.gameTeamLogoBlock}>
          <TeamLogo
            imagePath={fixture.awayTeam?.imagePath}
            teamName={awayTeamName}
            size={56}
          />
          <AppText variant="body" style={styles.gameTeamName} numberOfLines={1}>
            {awayTeamName}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gameRowContainer: {
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  gameTeamName: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  gameHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gameLogosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  gameTeamLogoBlock: {
    flex: 1,
    alignItems: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "600",
  },
  scoreSeparator: {
    fontSize: 20,
  },
});
