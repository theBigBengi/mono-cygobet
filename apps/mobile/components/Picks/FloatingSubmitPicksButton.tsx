// components/Picks/FloatingSubmitPicksButton.tsx
// Floating submit button for picks.
// Only visible when at least one pick is selected.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { useSelectedPicks } from "@/features/picks/picks.hooks";
import { useTheme } from "@/lib/theme";

export function FloatingSubmitPicksButton() {
  const { picks, count, hasAnyPick } = useSelectedPicks();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  if (!hasAnyPick) {
    return null;
  }

  const handleSubmit = () => {
    console.log(picks);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          padding: theme.spacing.md,
        },
      ]}
      pointerEvents="box-none"
    >
      <Button
        label={`Submit (${count})`}
        onPress={handleSubmit}
        style={styles.button}
      />
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
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

