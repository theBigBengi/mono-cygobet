// features/group-creation/selection/games/components/GameSelectionCard.tsx
// Vertical game selection card component for group games selection.
// Shows teams vertically with logos on the left, selection toggle on the right.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffTime } from "@/utils/fixture";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import { SelectionToggleButton } from "../../../components/SelectionToggleButton";
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
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();

  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  // Calculate card radius style based on position in group
  const cardRadiusStyle = { borderRadius: 0 };

  const cardBorderStyle =
    positionInGroup === "middle" || positionInGroup === "bottom"
      ? { borderTopWidth: 0 }
      : {};

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, { opacity: pressed ? 0.8 : 1 }]}
    >
      <Card
        style={[
          styles.matchCard,
          cardRadiusStyle,
          cardBorderStyle,
          { backgroundColor: theme.colors.cardBackground },
        ]}
      >
        <View style={styles.matchContent}>
          <View style={styles.timeContainer}>
            <AppText
              variant="caption"
              style={[styles.timeText, { color: theme.colors.textSecondary }]}
            >
              {formatKickoffTime(fixture.kickoffAt)}
            </AppText>
          </View>
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
          <SelectionToggleButton
            isSelected={isSelected}
            onPress={onPress ?? (() => {})}
          />
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
    marginBottom: 0,
    paddingVertical: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeContainer: {
    justifyContent: "center",
    alignItems: "flex-start",
    marginStart: -4,
    marginEnd: 16,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  rowsContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
  },
});
