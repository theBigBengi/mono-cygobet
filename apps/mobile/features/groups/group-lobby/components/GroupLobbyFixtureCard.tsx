import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffTime, getTeamDisplayName } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

interface GroupLobbyFixtureCardProps {
  /**
   * Fixture data to display
   */
  fixture: FixtureItem;
  /**
   * When true, display fixture.result (final score) instead of prediction.
   * Used for ended groups.
   */
  showFinalScore?: boolean;
}

/**
 * Component for displaying a single fixture card.
 * Extracted from GroupFixtureRow in the original file.
 * Shows teams, logos, date, and time.
 */
export function GroupLobbyFixtureCard({
  fixture,
  showFinalScore = false,
}: GroupLobbyFixtureCardProps) {
  const { theme } = useTheme();

  // Parse score from prediction or result
  const scoreDisplay = (() => {
    if (showFinalScore && fixture.result) {
      const parts = fixture.result.replace(":", "-").split("-");
      if (parts.length === 2) {
        return { home: parts[0].trim(), away: parts[1].trim() };
      }
    }
    if (!showFinalScore && fixture.prediction) {
      const home = fixture.prediction.home;
      const away = fixture.prediction.away;
      if (home !== null && home !== undefined && away !== null && away !== undefined) {
        return { home: String(home), away: String(away) };
      }
    }
    return null;
  })();
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

        {/* Score Display (prediction or final result) */}
        <View style={styles.scoreContainer}>
          <AppText variant="body" style={styles.scoreText}>
            {scoreDisplay?.home ?? "—"}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.scoreSeparator}>
            {" : "}
          </AppText>
          <AppText variant="body" style={styles.scoreText}>
            {scoreDisplay?.away ?? "—"}
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
