// components/Fixtures/FixtureCard.tsx
// Presentation-only fixture card component with match layout.
// - Uses Card, Row, Stack, AppText from UI layer
// - Accepts fixture object (type from @repo/types via feature types)
// - Shows: Home team | Date+Time | Away team (top row)
// - Shows: 3 equal odds buttons (1, X, 2) (bottom row)

import React from "react";
import { View, Pressable } from "react-native";
import { Card, AppText, Row, Stack, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiFixturesListResponse } from "@repo/types";
import {
  formatKickoffDate,
  formatKickoffTime,
  getTeamDisplayName,
  extractMatchOdds,
} from "@/utils";

import { fixtureStyles, useFixtureThemeStyles } from "./styles";

type FixtureItem = ApiFixturesListResponse["data"][0];

interface FixtureCardProps {
  fixture: FixtureItem;
  onPressCard?: () => void;
  onPressOutcome?: (outcome: "home" | "draw" | "away") => void;
  selectedPick?: "1" | "X" | "2" | null;
  onPick?: (pick: "1" | "X" | "2") => void;
}

function TeamSection({
  team,
  side,
}: {
  team?: { name?: string | null; imagePath?: string | null } | null;
  side: "home" | "away";
}) {
  const teamName = getTeamDisplayName(
    team?.name,
    side === "home" ? "Home" : "Away"
  );
  const isHome = side === "home";

  return (
    <View style={fixtureStyles.teamSection}>
      {isHome ? (
        <>
          {/* Home: Name first, then logo */}
          <AppText
            variant="body"
            numberOfLines={1}
            style={fixtureStyles.teamName}
          >
            {teamName}
          </AppText>
          <TeamLogo imagePath={team?.imagePath} teamName={teamName} size={32} />
        </>
      ) : (
        <>
          {/* Away: Logo first, then name */}
          <TeamLogo imagePath={team?.imagePath} teamName={teamName} size={32} />
          <AppText
            variant="body"
            numberOfLines={1}
            style={fixtureStyles.teamName}
          >
            {teamName}
          </AppText>
        </>
      )}
    </View>
  );
}

function KickoffSection({
  kickoffAt,
}: {
  kickoffAt: string | null | undefined;
}) {
  const dateLabel = formatKickoffDate(kickoffAt);
  const timeLabel = formatKickoffTime(kickoffAt);

  return (
    <Stack style={fixtureStyles.kickoffSection}>
      <AppText variant="caption" color="secondary">
        {dateLabel}
      </AppText>
      <AppText variant="body" style={fixtureStyles.kickoffTime}>
        {timeLabel}
      </AppText>
    </Stack>
  );
}

function OddsButton({
  label,
  value,
  onPress,
  isSelected,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  isSelected?: boolean;
}) {
  const themeStyles = useFixtureThemeStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        themeStyles.oddsButton,
        isSelected && themeStyles.oddsButtonSelected,
        pressed && themeStyles.oddsButtonPressed,
      ]}
      onPress={onPress}
    >
      <Row style={fixtureStyles.oddsButtonContent}>
        <AppText
          variant="caption"
          color={isSelected ? "primary" : "secondary"}
          style={isSelected ? themeStyles.oddsLabelSelected : undefined}
        >
          {label}
        </AppText>
        <AppText
          variant="body"
          style={[
            fixtureStyles.oddsValue,
            isSelected && themeStyles.oddsValueSelected,
          ]}
        >
          {value}
        </AppText>
      </Row>
    </Pressable>
  );
}

export function FixtureCard({
  fixture,
  onPressCard,
  onPressOutcome,
  selectedPick,
  onPick,
}: FixtureCardProps) {
  const { home, draw, away } = extractMatchOdds(fixture.odds);

  // Use picks if provided, otherwise fall back to onPressOutcome
  const handleHomePress = onPick
    ? () => onPick("1")
    : onPressOutcome
      ? () => onPressOutcome("home")
      : undefined;
  const handleDrawPress = onPick
    ? () => onPick("X")
    : onPressOutcome
      ? () => onPressOutcome("draw")
      : undefined;
  const handleAwayPress = onPick
    ? () => onPick("2")
    : onPressOutcome
      ? () => onPressOutcome("away")
      : undefined;

  return (
    <Card>
      {/* Header Row: Home | Date+Time | Away */}
      <Row style={fixtureStyles.headerRow}>
        <TeamSection team={fixture.homeTeam} side="home" />
        <KickoffSection kickoffAt={fixture.kickoffAt} />
        <TeamSection team={fixture.awayTeam} side="away" />
      </Row>

      {/* Odds Row: 1 | X | 2 */}
      <Row style={fixtureStyles.oddsRow}>
        <OddsButton
          label="1"
          value={home}
          onPress={handleHomePress}
          isSelected={selectedPick === "1"}
        />
        <OddsButton
          label="X"
          value={draw}
          onPress={handleDrawPress}
          isSelected={selectedPick === "X"}
        />
        <OddsButton
          label="2"
          value={away}
          onPress={handleAwayPress}
          isSelected={selectedPick === "2"}
        />
      </Row>
    </Card>
  );
}
