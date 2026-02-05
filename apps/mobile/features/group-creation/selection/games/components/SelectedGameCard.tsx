// features/group-creation/selection/games/components/SelectedGameCard.tsx
// Card component for displaying a selected game in the modal.
// Vertical layout: home team above away team, remove button on the right (same as GameSelectionCard).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import { MaterialIcons } from "@expo/vector-icons";
import type { FixtureItem, PositionInGroup } from "@/types/common";

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

  // Same radius/border logic as GameSelectionCard
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
      style={[
        styles.matchCard,
        cardRadiusStyle,
        cardBorderStyle,
        { backgroundColor: theme.colors.cardBackground },
      ]}
    >
      <View style={styles.matchContent}>
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
    marginHorizontal: 4,
    marginBottom: 0,
    paddingVertical: 8,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
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
