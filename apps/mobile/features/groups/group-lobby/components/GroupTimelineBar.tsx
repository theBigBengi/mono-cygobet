// features/groups/group-lobby/components/GroupTimelineBar.tsx
// Timeline progress bar showing group duration from start to end date.

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { format } from "date-fns";

interface GroupTimelineBarProps {
  startDate: string;
  endDate: string;
  /** Progress value between 0 and 1 */
  progress: number;
  /** When true, shows skeleton loader */
  isLoading?: boolean;
}

function GroupTimelineBarInner({
  startDate,
  endDate,
  progress,
  isLoading = false,
}: GroupTimelineBarProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isLoading) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Skeleton loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.barContainer}>
          <Animated.View
            style={[
              styles.flagContainer,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.track,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.trophyContainer,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
        </View>
        <View style={styles.labelsContainer}>
          <Animated.View
            style={[
              styles.skeletonLabel,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonLabel,
              { backgroundColor: theme.colors.border },
              animatedStyle,
            ]}
          />
        </View>
      </View>
    );
  }

  const startFormatted = format(new Date(startDate), "dd.MM.");
  const endFormatted = format(new Date(endDate), "dd.MM.");

  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.container}>
      <AppText variant="caption" color="secondary" style={styles.dateLabel}>
        {startFormatted}
      </AppText>
      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedProgress * 100}%`,
              backgroundColor: theme.colors.textSecondary,
            },
          ]}
        />
      </View>
      <AppText variant="caption" color="secondary" style={styles.dateLabel}>
        {endFormatted}
      </AppText>
    </View>
  );
}

export const GroupTimelineBar = React.memo(GroupTimelineBarInner);

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.ml,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    track: {
      flex: 1,
      height: 3,
      borderRadius: 2,
    },
    fill: {
      height: "100%",
      borderRadius: 2,
    },
    dateLabel: {
      fontSize: 11,
    },
    skeletonLabel: {
      width: 32,
      height: 10,
      borderRadius: theme.spacing.xs,
    },
  });
