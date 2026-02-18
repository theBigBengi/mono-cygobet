// features/group-creation/selection/games/components/GameSelectionCard.tsx
// Game-like selection card with shadow, 3D effect, and haptic feedback.

import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffTime } from "@/utils/fixture";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
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

  const handlePress = () => {
    if (!isSelected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
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

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          getBorderRadius(),
          positionInGroup !== "single" && positionInGroup !== "top" && styles.cardConnected,
          positionInGroup === "bottom" || positionInGroup === "single"
            ? styles.cardWithBottomBorder
            : {},
          {
            backgroundColor: isSelected
              ? theme.colors.primary + "08"
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary + "40"
              : theme.colors.border,
            borderBottomColor: isSelected
              ? theme.colors.primary + "40"
              : positionInGroup === "bottom" || positionInGroup === "single"
                ? theme.colors.textSecondary + "30"
                : theme.colors.border,
            shadowColor: isSelected ? theme.colors.primary : "#000",
            shadowOpacity: pressed ? 0 : isSelected ? 0.15 : 0.06,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {/* Time Chip */}
        <View
          style={[
            styles.timeChip,
            {
              backgroundColor: isSelected
                ? theme.colors.primary + "15"
                : theme.colors.textSecondary + "10",
            },
          ]}
        >
          <Text
            style={[
              styles.timeText,
              { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            {formatKickoffTime(fixture.kickoffAt)}
          </Text>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          {/* Home Team */}
          <View style={styles.teamRow}>
            <View style={styles.logoContainer}>
              <TeamLogo
                imagePath={fixture.homeTeam?.imagePath}
                teamName={homeTeamName}
                size={28}
              />
            </View>
            <Text
              style={[
                styles.teamName,
                { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {homeTeamName}
            </Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamRow}>
            <View style={styles.logoContainer}>
              <TeamLogo
                imagePath={fixture.awayTeam?.imagePath}
                teamName={awayTeamName}
                size={28}
              />
            </View>
            <Text
              style={[
                styles.teamName,
                { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {awayTeamName}
            </Text>
          </View>
        </View>

        {/* Toggle Button */}
        <SelectionToggleButton
          isSelected={isSelected}
          onPress={handlePress}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardConnected: {
    borderTopWidth: 0,
    marginTop: -1,
  },
  cardWithBottomBorder: {
    borderBottomWidth: 3,
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  teamsContainer: {
    flex: 1,
    gap: 6,
    marginHorizontal: 8,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
