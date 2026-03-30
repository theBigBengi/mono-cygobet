// components/Fixtures/GameCardBase.tsx
// Base game card: home team | middle slot (children) | away team.
// MatchPredictionCard-style layout (radius 16, positionInGroup). Used by
// MatchPredictionCard, GameSelectionCard, SelectedGameCard.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, AppText, TeamLogo } from "@/components/ui";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

interface GameCardBaseProps {
  fixture: FixtureItem;
  positionInGroup?: PositionInGroup;
  children?: React.ReactNode;
  /** When provided, the card is pressable and navigates to fixture detail (or custom action). */
  onPress?: () => void;
}

export function GameCardBase({
  fixture,
  positionInGroup = "single",
  children,
  onPress,
}: GameCardBaseProps) {
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();
  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  const cardRadiusStyle =
    positionInGroup === "single"
      ? { borderRadius: theme.radius.xl }
      : positionInGroup === "top"
        ? {
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          }
        : positionInGroup === "bottom"
          ? {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: theme.radius.xl,
              borderBottomRightRadius: theme.radius.xl,
            }
          : { borderRadius: 0 };

  const cardBorderStyle =
    positionInGroup === "middle" || positionInGroup === "bottom"
      ? { borderTopWidth: 0 }
      : {};

  const card = (
    <Card
      style={[styles.matchCard, cardRadiusStyle, cardBorderStyle, {
        marginHorizontal: theme.spacing.xs,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
        ...getShadowStyle("md"),
      }]}
    >
      <View style={styles.matchContent}>
        <View style={[styles.teamSection, { gap: theme.spacing.sm }]}>
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

        <View style={[styles.teamSectionAway, { gap: theme.spacing.sm }]}>
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

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${homeTeamName} vs ${awayTeamName}`}
      >
        {card}
      </Pressable>
    );
  }
  return card;
}

// Static layout styles — theme-dependent values applied inline via `theme`
const styles = StyleSheet.create({
  matchCard: {
    marginBottom: 0,
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
    minWidth: 0,
  },
  teamSectionAway: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
  },
  teamName: {
    flex: 1,
    fontWeight: "500",
    minWidth: 0,
  },
  teamNameAway: {
    flex: 1,
    minWidth: 0,
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
