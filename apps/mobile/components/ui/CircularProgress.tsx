// components/ui/CircularProgress.tsx
// Progress indicator - linear bar with percentage.

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "./AppText";
import { useTheme } from "@/lib/theme";

export type CircularProgressProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showLabel?: boolean;
};

/**
 * Progress indicator showing percentage + linear bar.
 * (Circular SVG has compatibility issues with new architecture)
 */
export function CircularProgress({
  progress,
  size = 40,
  color,
  showLabel = false,
}: CircularProgressProps) {
  const { theme } = useTheme();
  const progressColor = color ?? theme.colors.primary;
  const trackColor = theme.colors.border;
  const filled = Math.max(0, Math.min(1, progress));
  const percent = Math.round(filled * 100);

  return (
    <View style={[styles.container, { width: size * 1.5 }]}>
      {showLabel && (
        <AppText
          variant="caption"
          style={[
            styles.label,
            { color: theme.colors.textPrimary, marginBottom: 4 },
          ]}
        >
          {percent}%
        </AppText>
      )}
      <View style={[styles.track, { backgroundColor: trackColor, height: 4 }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: progressColor,
              width: `${percent}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  track: {
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
});
