// components/RoundNavigator.tsx
// Compact round navigator: [◀] Round N [▶]. Tap label opens full round picker.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface RoundNavigatorProps {
  selectedRound: string;
  onPrev: () => void;
  onNext: () => void;
  onOpenPicker: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  /** Override label (e.g. "All Games", "To Predict") */
  labelOverride?: string;
}

export function RoundNavigator({
  selectedRound,
  onPrev,
  onNext,
  onOpenPicker,
  canGoPrev,
  canGoNext,
  labelOverride,
}: RoundNavigatorProps) {
  const { theme } = useTheme();
  const label = labelOverride ?? (selectedRound ? `Round ${selectedRound}` : "Round");

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPrev}
        disabled={!canGoPrev}
        style={[styles.arrow, !canGoPrev && styles.arrowDisabled]}
        hitSlop={8}
      >
        <MaterialIcons
          name="chevron-left"
          size={24}
          color={canGoPrev ? theme.colors.text : theme.colors.textSecondary}
        />
      </Pressable>
      <Pressable onPress={onOpenPicker} style={styles.labelWrap} hitSlop={8}>
        <AppText variant="caption" style={[styles.label, { color: theme.colors.primary }]}>
          {label}
        </AppText>
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={!canGoNext}
        style={[styles.arrow, !canGoNext && styles.arrowDisabled]}
        hitSlop={8}
      >
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={canGoNext ? theme.colors.text : theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  arrow: {
    padding: 4,
  },
  arrowDisabled: {
    opacity: 0.5,
  },
  labelWrap: {
    minWidth: 80,
    alignItems: "center",
  },
  label: {
    fontWeight: "600",
  },
});
