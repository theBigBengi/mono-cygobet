// components/ui/SegmentedProgressBar.tsx
// Progress bar with 4 segments showing prediction status vs game completion.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

export interface SegmentedProgressBarProps {
  /** Games that user predicted and have finished (green) */
  predictedAndFinished: number;
  /** Games that finished but user didn't predict - missed (gray) */
  missed: number;
  /** Games that user predicted but haven't started yet (blue) */
  predictedWaiting: number;
  /** Games that haven't started and user hasn't predicted (empty) */
  upcoming: number;
  /** Bar height in pixels */
  height?: number;
}

export function SegmentedProgressBar({
  predictedAndFinished,
  missed,
  predictedWaiting,
  upcoming,
  height = 6,
}: SegmentedProgressBarProps) {
  const { theme } = useTheme();

  const total = predictedAndFinished + missed + predictedWaiting + upcoming;
  if (total === 0) return null;

  const pctPredictedFinished = (predictedAndFinished / total) * 100;
  const pctMissed = (missed / total) * 100;
  const pctPredictedWaiting = (predictedWaiting / total) * 100;
  // upcoming is the remainder (transparent/track color)

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: theme.colors.border,
        },
      ]}
    >
      {/* Predicted & Finished - Green */}
      {pctPredictedFinished > 0 && (
        <View
          style={[
            styles.segment,
            {
              width: `${pctPredictedFinished}%`,
              backgroundColor: theme.colors.success,
              borderTopLeftRadius: height / 2,
              borderBottomLeftRadius: height / 2,
              borderTopRightRadius: pctMissed === 0 && pctPredictedWaiting === 0 ? height / 2 : 0,
              borderBottomRightRadius: pctMissed === 0 && pctPredictedWaiting === 0 ? height / 2 : 0,
            },
          ]}
        />
      )}
      {/* Missed - Gray */}
      {pctMissed > 0 && (
        <View
          style={[
            styles.segment,
            {
              width: `${pctMissed}%`,
              backgroundColor: theme.colors.textSecondary,
              borderTopLeftRadius: pctPredictedFinished === 0 ? height / 2 : 0,
              borderBottomLeftRadius: pctPredictedFinished === 0 ? height / 2 : 0,
              borderTopRightRadius: pctPredictedWaiting === 0 ? height / 2 : 0,
              borderBottomRightRadius: pctPredictedWaiting === 0 ? height / 2 : 0,
            },
          ]}
        />
      )}
      {/* Predicted & Waiting - Primary/Blue */}
      {pctPredictedWaiting > 0 && (
        <View
          style={[
            styles.segment,
            {
              width: `${pctPredictedWaiting}%`,
              backgroundColor: theme.colors.primary,
              borderTopLeftRadius: pctPredictedFinished === 0 && pctMissed === 0 ? height / 2 : 0,
              borderBottomLeftRadius: pctPredictedFinished === 0 && pctMissed === 0 ? height / 2 : 0,
              borderTopRightRadius: height / 2,
              borderBottomRightRadius: height / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: {
    height: "100%",
  },
});
