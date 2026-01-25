import React from "react";
import { View, StyleSheet, TextInput, Dimensions } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getTeamDisplayName } from "@/utils/fixture";
import type { GroupPrediction } from "@/features/groups/games-selection/group-games-selection.types";
import type { FixtureItem } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  homeRef: React.RefObject<TextInput | null> | undefined;
  awayRef: React.RefObject<TextInput | null> | undefined;
  homeFocused?: boolean;
  awayFocused?: boolean;
  isSaved?: boolean;
  onFocus: (type: "home" | "away") => void;
  onBlur?: () => void;
  onChange: (type: "home" | "away", nextText: string) => void;
  onAutoNext?: (type: "home" | "away") => void;
};

function toDisplay(value: number | null): string {
  return value === null ? "" : String(value);
}

/**
 * Single game match card - designed specifically for single game view.
 * Horizontal layout: Team Logo + Name | Score | Name + Team Logo
 */
export function SingleGameMatchCard({
  fixture,
  prediction,
  homeRef,
  awayRef,
  homeFocused,
  awayFocused,
  isSaved = false,
  onFocus,
  onBlur,
  onChange,
  onAutoNext,
}: Props) {
  const { theme } = useTheme();
  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");

  return (
    <Card style={styles.matchCard}>
      <View style={styles.matchContent}>
        {/* Home Team - Logo above Name */}
        <View style={styles.teamSection}>
          <TeamLogo
            imagePath={fixture.homeTeam?.imagePath}
            teamName={homeTeamName}
            size={48}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={2}>
            {homeTeamName}
          </AppText>
        </View>

        {/* Score Inputs Section */}
        <View style={styles.scoreSection}>
          <TextInput
            ref={homeRef}
            style={[
              styles.scoreInput,
              {
                borderColor: homeFocused
                  ? theme.colors.textSecondary
                  : isSaved
                    ? "rgba(34, 197, 94, 0.4)"
                    : theme.colors.border,
                borderWidth: homeFocused ? 2 : styles.scoreInput.borderWidth,
                backgroundColor: isSaved
                  ? "rgba(34, 197, 94, 0.03)"
                  : "rgba(15, 23, 42, 0.04)",
                color: theme.colors.textPrimary,
              },
            ]}
            value={toDisplay(prediction.home)}
            onChangeText={(text) => {
              const finalDigit = text.length > 0 ? text[text.length - 1] : "";
              onChange("home", finalDigit);
              if (finalDigit !== "" && onAutoNext) onAutoNext("home");
            }}
            keyboardType="number-pad"
            maxLength={2}
            textAlign="center"
            onFocus={() => onFocus("home")}
            onBlur={onBlur}
            placeholder=""
            placeholderTextColor={theme.colors.textSecondary}
          />
          <AppText variant="body" style={styles.scoreSeparator}>
            :
          </AppText>
          <TextInput
            ref={awayRef}
            style={[
              styles.scoreInput,
              {
                borderColor: awayFocused
                  ? theme.colors.textSecondary
                  : isSaved
                    ? "rgba(34, 197, 94, 0.4)"
                    : theme.colors.border,
                borderWidth: awayFocused ? 2 : styles.scoreInput.borderWidth,
                backgroundColor: isSaved
                  ? "rgba(34, 197, 94, 0.03)"
                  : "rgba(15, 23, 42, 0.04)",
                color: theme.colors.textPrimary,
              },
            ]}
            value={toDisplay(prediction.away)}
            onChangeText={(text) => {
              const finalDigit = text.length > 0 ? text[text.length - 1] : "";
              onChange("away", finalDigit);
              if (finalDigit !== "" && onAutoNext) onAutoNext("away");
            }}
            keyboardType="number-pad"
            maxLength={2}
            textAlign="center"
            onFocus={() => onFocus("away")}
            onBlur={onBlur}
            placeholder=""
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Away Team - Logo above Name */}
        <View style={styles.teamSectionAway}>
          <TeamLogo
            imagePath={fixture.awayTeam?.imagePath}
            teamName={awayTeamName}
            size={48}
          />
          <AppText variant="body" style={styles.teamNameAway} numberOfLines={2}>
            {awayTeamName}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    borderRadius: 0,
    alignSelf: "center",
    width: SCREEN_WIDTH,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  teamSection: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  teamSectionAway: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  teamNameAway: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  scoreInput: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: "700",
    marginHorizontal: 2,
  },
});
