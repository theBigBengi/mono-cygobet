// features/group-creation/selection/games/components/SelectedGameCard.tsx
// Game-like card for displaying a selected game in the modal.
// Vertical layout: home team above away team, remove button on the right.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { TeamRow } from "@/features/groups/predictions/components/TeamRow";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove?.();
  };

  // Calculate border radius based on position
  const getBorderRadius = () => {
    switch (positionInGroup) {
      case "top":
        return { borderTopLeftRadius: 14, borderTopRightRadius: 14 };
      case "bottom":
        return { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 };
      case "single":
        return { borderRadius: 14 };
      default:
        return {};
    }
  };

  const isConnected = positionInGroup === "middle" || positionInGroup === "bottom";

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.matchCard,
          getBorderRadius(),
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderBottomColor: positionInGroup === "bottom" || positionInGroup === "single"
              ? theme.colors.textSecondary + "40"
              : theme.colors.border,
            borderTopWidth: isConnected ? 0 : 1,
            borderBottomWidth: positionInGroup === "bottom" || positionInGroup === "single" ? 3 : 1,
          },
        ]}
      >
        <View style={styles.matchContent}>
          <View
            style={[
              styles.timeChip,
              { backgroundColor: theme.colors.textSecondary + "10" },
            ]}
          >
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
              onPress={handleRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.removeButton,
                {
                  backgroundColor: theme.colors.danger + "15",
                  borderColor: theme.colors.danger + "40",
                  borderBottomColor: pressed
                    ? theme.colors.danger + "40"
                    : theme.colors.danger + "60",
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <Ionicons name="close" size={18} color={theme.colors.danger} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: 12,
  },
  matchCard: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeChip: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 10,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  rowsContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 6,
    marginHorizontal: 10,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    shadowOpacity: 0.1,
    elevation: 2,
  },
});
