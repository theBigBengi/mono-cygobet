// features/fixtures/components/FixtureCard.tsx
// Presentation-only fixture card component with match layout.
// - Uses Card, Row, Stack, AppText, Button from UI layer
// - Accepts fixture object (type from @repo/types)
// - Shows: Home team | Date+Time | Away team (top row)
// - Shows: 3 equal odds buttons (1, X, 2) (bottom row)

import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Card, AppText, Row, Stack } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";
import { colors } from "@/theme";
import {
  formatKickoffDate,
  formatKickoffTime,
  getTeamDisplayName,
  extractMatchOdds,
} from "../fixtures.ui";

// Type matching the API response structure
type FixtureItem = {
  id: number;
  kickoffAt: string;
  league?: { name?: string | null; imagePath?: string | null } | null;
  homeTeam?: {
    id: number;
    name?: string | null;
    imagePath?: string | null;
  } | null;
  awayTeam?: {
    id: number;
    name?: string | null;
    imagePath?: string | null;
  } | null;
  odds?:
    | {
        id: number;
        value: string;
        label: string;
        marketName: string | null;
        probability: string | null;
        winning: boolean;
        name: string | null;
        handicap: string | null;
        total: string | null;
        sortOrder: number;
      }[]
    | null;
};

interface FixtureCardProps {
  fixture: FixtureItem;
  onPressCard?: () => void;
  onPressOutcome?: (outcome: "home" | "draw" | "away") => void;
  selectedPick?: "1" | "X" | "2" | null;
  onPick?: (pick: "1" | "X" | "2") => void;
}

const LOGO_SIZE = 32;

function TeamLogo({
  imagePath,
  teamName,
}: {
  imagePath?: string | null;
  teamName: string;
}) {
  if (imagePath) {
    return (
      <Image
        source={{ uri: imagePath }}
        style={styles.teamLogo}
        resizeMode="contain"
      />
    );
  }
  // Placeholder circle
  return (
    <View style={styles.teamLogoPlaceholder}>
      <AppText variant="caption" color="secondary">
        {teamName.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
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
    <View style={sharedStyles.fixtureTeamSection}>
      {isHome ? (
        <>
          {/* Home: Name first, then logo */}
          <AppText
            variant="body"
            numberOfLines={1}
            style={sharedStyles.fixtureTeamName}
          >
            {teamName}
          </AppText>
          <TeamLogo imagePath={team?.imagePath} teamName={teamName} />
        </>
      ) : (
        <>
          {/* Away: Logo first, then name */}
          <TeamLogo imagePath={team?.imagePath} teamName={teamName} />
          <AppText
            variant="body"
            numberOfLines={1}
            style={sharedStyles.fixtureTeamName}
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
    <Stack style={sharedStyles.fixtureKickoffSection}>
      <AppText variant="caption" color="secondary">
        {dateLabel}
      </AppText>
      <AppText variant="body" style={sharedStyles.fixtureKickoffTime}>
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
  return (
    <Pressable
      style={({ pressed }) => [
        sharedStyles.fixtureOddsButton,
        isSelected && sharedStyles.fixtureOddsButtonSelected,
        pressed && sharedStyles.fixtureOddsButtonPressed,
      ]}
      onPress={onPress}
    >
      <Row style={sharedStyles.fixtureOddsButtonContent}>
        <AppText
          variant="caption"
          color={isSelected ? "primary" : "secondary"}
          style={isSelected ? sharedStyles.fixtureOddsLabelSelected : undefined}
        >
          {label}
        </AppText>
        <AppText
          variant="body"
          style={[
            sharedStyles.fixtureOddsValue,
            isSelected && sharedStyles.fixtureOddsValueSelected,
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
      <Row style={sharedStyles.fixtureHeaderRow}>
        <TeamSection team={fixture.homeTeam} side="home" />
        <KickoffSection kickoffAt={fixture.kickoffAt} />
        <TeamSection team={fixture.awayTeam} side="away" />
      </Row>

      {/* Odds Row: 1 | X | 2 */}
      <Row style={sharedStyles.fixtureOddsRow}>
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

const styles = StyleSheet.create({
  teamLogo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
  },
  teamLogoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
