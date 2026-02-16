// features/groups/group-lobby/components/GroupTimelineBar.tsx
// Timeline progress bar showing group duration from start to end date.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { format } from "date-fns";

interface GroupTimelineBarProps {
  startDate: string;
  endDate: string;
  /** Progress value between 0 and 1 */
  progress: number;
}

export function GroupTimelineBar({
  startDate,
  endDate,
  progress,
}: GroupTimelineBarProps) {
  const { theme } = useTheme();

  const startFormatted = format(new Date(startDate), "dd.MM.");
  const endFormatted = format(new Date(endDate), "dd.MM.");

  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const isCompleted = progress >= 1;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {/* Flag icon at start */}
        <View
          style={[
            styles.flagContainer,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Entypo
            name="flag"
            size={14}
            color={theme.colors.primaryText}
          />
        </View>

        {/* Track with dot inside */}
        <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
          {/* Filled portion */}
          <View
            style={[
              styles.fill,
              {
                width: `${clampedProgress * 100}%`,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
          {/* Current position indicator - only show if started and not completed */}
          {clampedProgress > 0 && !isCompleted && (
            <View
              style={[
                styles.currentDot,
                {
                  backgroundColor: theme.colors.primary,
                  left: `${clampedProgress * 100}%`,
                },
              ]}
            />
          )}
        </View>

        {/* Trophy icon at end */}
        <View
          style={[
            styles.trophyContainer,
            {
              backgroundColor: isCompleted
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="trophy"
            size={14}
            color={isCompleted
              ? theme.colors.primaryText
              : theme.colors.textSecondary}
          />
        </View>
      </View>

      {/* Date labels */}
      <View style={styles.labelsContainer}>
        <AppText variant="caption" color="secondary" style={styles.dateLabel}>
          {startFormatted}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.dateLabel}>
          {endFormatted}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 28,
  },
  flagContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
    position: "relative",
    justifyContent: "center",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  currentDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    top: -4,
  },
  trophyContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingEnd: 0,
  },
  dateLabel: {
    fontSize: 10,
  },
});
