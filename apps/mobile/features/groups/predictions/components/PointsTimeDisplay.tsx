import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import type { GameResultOrTime } from "../utils/fixture-helpers";

type PointsTimeDisplayProps = {
  isEditable: boolean;
  isLive: boolean;
  isFinished: boolean;
  time: string | null;
  points: number | null;
};

/**
 * Displays points (finished) or time (upcoming) or status
 */
export function PointsTimeDisplay({
  isEditable,
  isLive,
  isFinished,
  time,
  points,
}: PointsTimeDisplayProps) {
  return (
    <View style={styles.pointsContainer}>
      <View style={styles.pointsBadge}>
        {isEditable ? (
          // Game hasn't started - show kickoff time
          <AppText variant="caption" color="secondary" style={styles.timeText}>
            {time || "-"}
          </AppText>
        ) : isLive ? (
          // Game is live - show time placeholder
          <AppText variant="caption" color="secondary" style={styles.timeText}>
            LIVE
          </AppText>
        ) : isFinished ? (
          // Game finished - show points (including 0)
          // If no prediction exists, show 0 points
          <AppText variant="caption" color="secondary" style={styles.pointsText}>
            {points !== null && points !== undefined ? `${points}pt` : "0pt"}
          </AppText>
        ) : (
          // Cancelled or other status
          <AppText variant="caption" color="secondary" style={styles.timeText}>
            -
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pointsContainer: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pointsBadge: {
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: 12,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
