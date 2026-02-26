import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { TeamLogo } from "@/components/ui";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { formatKickoffTime } from "@/utils/fixture";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { FixtureItem, PositionInGroup } from "@/types/common";

type Props = {
  fixture: FixtureItem;
  positionInGroup?: PositionInGroup;
  /** When true, card is dimmed and shows blue plus (restore) instead of X (remove) */
  isDeselected?: boolean;
  onRemove?: () => void;
  onRestore?: () => void;
};

/**
 * Match card with remove/restore button for draft editing.
 * Layout: [Time Chip] [Home / Away teams] [X or + button]
 */
export function MatchDraftCard({
  fixture,
  positionInGroup = "single",
  isDeselected = false,
  onRemove,
  onRestore,
}: Props) {
  const { t } = useTranslation("common");
  const { translateTeam } = useEntityTranslation();
  const { theme } = useTheme();

  const homeTeamName = translateTeam(fixture.homeTeam?.name, t("common.home"));
  const awayTeamName = translateTeam(fixture.awayTeam?.name, t("common.away"));

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

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          getBorderRadius(),
          positionInGroup !== "single" && positionInGroup !== "top" && styles.cardConnected,
          (positionInGroup === "bottom" || positionInGroup === "single") && styles.cardWithBottomBorder,
          {
            backgroundColor: isDeselected
              ? theme.colors.surface
              : theme.colors.surface,
            borderColor: isDeselected
              ? theme.colors.border
              : theme.colors.border,
            borderBottomColor:
              positionInGroup === "bottom" || positionInGroup === "single"
                ? theme.colors.textSecondary + "30"
                : theme.colors.border,
            opacity: isDeselected ? 0.45 : 1,
          },
        ]}
      >
        {/* Time Chip */}
        <View
          style={[
            styles.timeChip,
            {
              backgroundColor: theme.colors.textSecondary + "10",
            },
          ]}
        >
          <Text
            style={[
              styles.timeText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {formatKickoffTime(fixture.kickoffAt)}
          </Text>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <TeamLogo
              imagePath={fixture.homeTeam?.imagePath}
              teamName={homeTeamName}
              size={24}
            />
            <Text
              style={[styles.teamName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {homeTeamName}
            </Text>
          </View>
          <View style={styles.teamRow}>
            <TeamLogo
              imagePath={fixture.awayTeam?.imagePath}
              teamName={awayTeamName}
              size={24}
            />
            <Text
              style={[styles.teamName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {awayTeamName}
            </Text>
          </View>
        </View>

        {/* Remove / Restore Button */}
        <Pressable
          onPress={isDeselected ? onRestore : onRemove}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: isDeselected
                ? theme.colors.primary
                : theme.colors.surface,
              borderColor: isDeselected
                ? theme.colors.primary
                : theme.colors.border,
              borderBottomColor: isDeselected
                ? theme.colors.primary
                : theme.colors.textSecondary + "40",
              shadowColor: isDeselected ? theme.colors.primary : "#000",
              shadowOpacity: pressed ? 0 : isDeselected ? 0.25 : 0.1,
              transform: [{ scale: pressed ? 0.9 : 1 }],
            },
          ]}
        >
          <MaterialIcons
            name={isDeselected ? "add" : "close"}
            size={16}
            color={isDeselected ? "#fff" : theme.colors.danger}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  cardConnected: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: -1,
  },
  cardWithBottomBorder: {
    borderBottomWidth: 3,
  },
  timeChip: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  teamsContainer: {
    flex: 1,
    gap: 4,
    marginHorizontal: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
});
