// features/group-creation/components/LeagueListItem.tsx
// Game-like league selection card with shadow and 3D effect.

import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useToggleLeague,
  useIsLeagueSelected,
} from "@/features/group-creation/selection/leagues";
import { SelectionToggleButton } from "./SelectionToggleButton";
import type { ApiLeagueItem } from "@repo/types";

interface LeagueListItemProps {
  league: ApiLeagueItem;
}

export function LeagueListItem({ league }: LeagueListItemProps) {
  const { theme } = useTheme();
  const toggleLeague = useToggleLeague();
  const isSelected = useIsLeagueSelected(league.id);

  const handlePress = () => {
    if (!isSelected) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleLeague(league);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isSelected
              ? theme.colors.primary + "08"
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary + "40"
              : theme.colors.border,
            borderBottomColor: isSelected
              ? theme.colors.primary + "40"
              : theme.colors.textSecondary + "30",
            shadowColor: "#000",
            shadowOpacity: pressed ? 0 : isSelected ? 0.15 : 0.08,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <TeamLogo
            imagePath={league.imagePath}
            teamName={league.name}
            size={40}
          />
        </View>
        <View style={styles.nameContainer}>
          <Text
            style={[
              styles.name,
              { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {league.name}
          </Text>
          {league.country?.name && (
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {league.country.name}
            </Text>
          )}
        </View>
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
    paddingVertical: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  nameContainer: {
    flex: 1,
    marginStart: 14,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
