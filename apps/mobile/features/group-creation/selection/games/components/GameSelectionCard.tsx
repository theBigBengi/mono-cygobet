// features/group-creation/selection/games/components/GameSelectionCard.tsx
// Vertical game selection card component for group games selection.
// Shows teams vertically with logos on the left, kickoff time on the right.
// Card is pressable and shows border when selected (like leagues/teams).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getTeamDisplayName } from "@/utils/fixture";
import { formatKickoffTime } from "@/utils/fixture";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import type { FixtureItem, PositionInGroup } from "@/types/common";

interface GameSelectionCardProps {
  fixture: FixtureItem;
  isSelected?: boolean;
  onPress?: () => void;
  positionInGroup?: PositionInGroup;
}

export function GameSelectionCard({
  fixture,
  isSelected = false,
  onPress,
  positionInGroup = "single",
}: GameSelectionCardProps) {
  const { theme } = useTheme();

  const homeTeamName = getTeamDisplayName(fixture.homeTeam?.name, "Home");
  const awayTeamName = getTeamDisplayName(fixture.awayTeam?.name, "Away");
  const kickoffTime = formatKickoffTime(fixture.kickoffAt);

  // Calculate card radius style based on position in group
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
  !isSelected && (positionInGroup === "middle" || positionInGroup === "bottom")
      ? { borderTopWidth: 0 }
      : {};

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Card
        style={[
          styles.matchCard,
          cardRadiusStyle,
          cardBorderStyle,
        
          { backgroundColor: theme.colors.cardBackground },
          isSelected && {
            borderColor: theme.colors.primary,
            borderWidth: 2,
            backgroundColor: theme.colors.primary + '15',
          },
        ]}
      >
        <View style={styles.matchContent}>
          {/* Teams container - vertical layout */}
          <View style={styles.rowsContainer}>
            <TeamRow
              team={fixture.homeTeam}
              teamName={homeTeamName}
              isWinner={false}
            />
            <TeamRow
              team={fixture.awayTeam}
              teamName={awayTeamName}
              isWinner={false}
            />
          </View>

          {/* Right side - kickoff time */}
          <View style={styles.rightContainer}>
            <View style={styles.timeContainer}>
              <AppText variant="caption" color="secondary" style={styles.timeText}>
                {kickoffTime}
              </AppText>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 0,
  },
  matchCard: {
    marginHorizontal: 4,
    marginBottom: 0,
    padding: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowsContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
  rightContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timeContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  timeText: {
    fontSize: 12,
  },
});
