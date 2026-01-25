// features/home/components/FloatingCreateGroupButton.tsx
// FAB for create-group from selection. Shown when current mode has selection.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useHasSelectionForMode,
  useSelectionLabelForMode,
} from "../hooks/useCreationSelection";
import type { HomeMode } from "./HomeModeSelector";

interface FloatingCreateGroupButtonProps {
  mode: HomeMode;
  onPress: () => void;
}

export function FloatingCreateGroupButton({
  mode,
  onPress,
}: FloatingCreateGroupButtonProps) {
  const { theme } = useTheme();
  const hasSelection = useHasSelectionForMode(mode);
  const label = useSelectionLabelForMode(mode);

  if (!hasSelection || !label) return null;

  return (
    <View
      style={[styles.container, { padding: theme.spacing.md }]}
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
