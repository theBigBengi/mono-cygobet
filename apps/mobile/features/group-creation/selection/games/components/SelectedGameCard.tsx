// features/group-creation/selection/games/components/SelectedGameCard.tsx
// Card component for displaying a selected game in the modal.
// Shows team names with logos and optional remove button.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { GameCardBase } from "@/components/Fixtures";
import {   MaterialIcons } from "@expo/vector-icons";
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
  const { theme } = useTheme();

  const centerContent = onRemove ? (
    <View style={styles.centerButtonContainer}>
      <Pressable
        style={({ pressed }) => [styles.centerButton, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={onRemove}
      >
       <MaterialIcons name="close" size={18} color={theme.colors.danger} />
      </Pressable>
    </View>
  ) : undefined;

  return (
    <GameCardBase fixture={fixture} positionInGroup={positionInGroup}>
      {centerContent}
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
