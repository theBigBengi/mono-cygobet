// components/Fixtures/GameCardBase.tsx
// Base game card: home team | middle slot (children) | away team.
// MatchPredictionCard-style layout (radius 16, positionInGroup). Used by
// MatchPredictionCard, GroupGameCard, SelectedGameCard.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { getTeamDisplayName } from "@/utils/fixture";
import type { ApiFixturesListResponse } from "@repo/types";
import { useTheme } from "@/lib/theme";

export type FixtureItem = ApiFixturesListResponse["data"][0];

export type PositionInGroup = "single" | "top" | "middle" | "bottom";

interface GameCardBaseProps {
  fixture: FixtureItem;
  positionInGroup?: PositionInGroup;
  children?: React.ReactNode;
}

export function GameCardBase({
  fixture,
  positionInGroup = "single",
  children,
}: GameCardBaseProps) {
  const { theme } = useTheme();
  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");

  const cardRadiusStyle =
    positionInGroup === "single"
      ? { borderRadius: 16 }
      : positionInGroup === "top"
        ? {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }
        : positionInGroup === "bottom"
          ? {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16,
            }
          : { borderRadius: 0 };

  const cardBorderStyle =
    positionInGroup === "middle" || positionInGroup === "bottom"
      ? { borderTopWidth: 0 }
      : {};

  return (
    <Card
      style={[styles.matchCard, cardRadiusStyle, cardBorderStyle, {
        backgroundColor: theme.colors.cardBackground,
      }]}
    >
      <View style={styles.matchContent}>
        <View style={styles.teamSection}>
          <TeamLogo
            imagePath={fixture.homeTeam?.imagePath}
            teamName={homeTeamName}
            size={28}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={1}>
            {homeTeamName}
          </AppText>
        </View>

        <View style={styles.middleSlot}>
          {children ?? <View style={styles.middleSpacer} />}
        </View>

        <View style={styles.teamSectionAway}>
          <AppText
            variant="body"
            style={styles.teamNameAway}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {awayTeamName}
          </AppText>
          <TeamLogo
            imagePath={fixture.awayTeam?.imagePath}
            teamName={awayTeamName}
            size={28}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    marginHorizontal: 4,
    marginBottom: 0,
    padding: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  teamSectionAway: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    minWidth: 0,
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    minWidth: 0,
  },
  teamNameAway: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
  },
  middleSlot: {
    flexShrink: 0,
  },
  middleSpacer: {
    minWidth: 72,
  },
});
