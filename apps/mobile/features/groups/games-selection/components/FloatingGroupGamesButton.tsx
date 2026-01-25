// features/group-games-selection/components/FloatingGroupGamesButton.tsx
// Floating button for selected group games.
// Only visible when at least one game is selected.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import {
  useSelectedGroupGames,
  useGroupGamesHydrated,
} from "../group-games-selection.hooks";
import { useTheme } from "@/lib/theme";

interface FloatingGroupGamesButtonProps {
  onPress: () => void;
}

export function FloatingGroupGamesButton({
  onPress,
}: FloatingGroupGamesButtonProps) {
  const { count, hasAnyGame } = useSelectedGroupGames();
  const hydrated = useGroupGamesHydrated();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Don't show until hydrated (prevent flicker)
  if (!hydrated || !hasAnyGame) {
    return null;
  }

  const label = count === 1 ? "1 Game" : `${count} Games`;

  return (
    <View
      style={[
        styles.container,
        {
          // paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          padding: theme.spacing.md,
        },
      ]}
      pointerEvents="box-none"
    >
      <Button label={label} onPress={onPress} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
    zIndex: 1000,
  },
  button: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 99,
  },
});
