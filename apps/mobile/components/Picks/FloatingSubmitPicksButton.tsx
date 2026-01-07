// components/Picks/FloatingSubmitPicksButton.tsx
// Floating submit button for picks.
// Only visible when at least one pick is selected.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { useSelectedPicks } from "@/features/picks/picks.hooks";
import { spacing, colors } from "@/theme";

export function FloatingSubmitPicksButton() {
  const { picks, count, hasAnyPick } = useSelectedPicks();
  const insets = useSafeAreaInsets();

  if (!hasAnyPick) {
    return null;
  }

  const handleSubmit = () => {
    // TODO: Implement submit logic
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
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
    padding: spacing.md,
    paddingBottom: spacing.md,
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

