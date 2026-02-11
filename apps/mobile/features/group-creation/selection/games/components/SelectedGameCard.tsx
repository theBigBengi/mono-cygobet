// features/group-creation/selection/games/components/SelectedGameCard.tsx
// Card component for displaying a selected game in the modal.
// Vertical layout: home team above away team, remove button on the right (same as GameSelectionCard).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import { MaterialIcons } from "@expo/vector-icons";
import type { FixtureItem, PositionInGroup } from "@/types/common";
import { formatKickoffTime, formatKickoffDate } from "@/utils/fixture";

interface SelectedGameCardProps {
  fixture: FixtureItem;
  onRemove?: () => void;
  positionInGroup?: PositionInGroup;
}

export function SelectedGameCard({
  fixture,
  onRemove,
  positionInGroup = "single",
}: SelectedGameCardProps) {
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();

  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

  // No border radius
  const cardRadiusStyle = { borderRadius: 0 };

  const cardBorderStyle =
    positionInGroup === "middle" || positionInGroup === "bottom"
      ? { borderTopWidth: 0 }
      : {};

  return (
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
            style={[styles.dateText, { color: theme.colors.textSecondary }]}
          >
            {formatKickoffDate(fixture.kickoffAt)}
          </AppText>
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
        {onRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.removeButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={20} color={theme.colors.danger} />
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    paddingVertical: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginStart: -4,
    marginEnd: 16,
  },
  dateText: {
    fontSize: 11,
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
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginStart: 8,
  },
});
