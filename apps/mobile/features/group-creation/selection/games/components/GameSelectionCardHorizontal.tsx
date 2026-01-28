// features/group-creation/selection/games/components/GameSelectionCardHorizontal.tsx
// OLD HORIZONTAL LAYOUT - Kept for reference (not in use)
// Game selection card component for group games selection.
// Shows home team, away team, plus button, and kickoff time.
// Supports selection state for group games selection.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { GameCardBase } from "@/components/Fixtures";
import {  MaterialIcons } from "@expo/vector-icons";
import type { FixtureItem, PositionInGroup } from "@/types/common";

interface GameSelectionCardProps {
  fixture: FixtureItem;
  isSelected?: boolean;
  onPress?: () => void;
  positionInGroup?: PositionInGroup;
}

export function GameSelectionCardHorizontal({
  fixture,
  isSelected = false,
  onPress,
  positionInGroup = "single",
}: GameSelectionCardProps) {
  const { theme } = useTheme();

  const centerButton = (
    <View style={styles.centerButtonContainer}>
      <Pressable
        style={({ pressed }) => [
          styles.centerButton,
          {
            backgroundColor: isSelected
              ? theme.colors.surface
              : theme.colors.background,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={onPress}
      >
        <MaterialIcons
          name={isSelected ? "close" : "add"}
          size={18}
          color={
            !isSelected
              ? theme.colors.primary
              : theme.colors.danger || theme.colors.textPrimary
          }
        />
      </Pressable>
    </View>
  );

  return (
    <GameCardBase fixture={fixture} positionInGroup={positionInGroup}>
      {centerButton}
    </GameCardBase>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 28,
    height: 28,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
