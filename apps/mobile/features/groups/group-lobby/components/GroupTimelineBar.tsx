// features/groups/group-lobby/components/GroupTimelineBar.tsx
// Timeline progress bar showing games completed out of total.

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

interface GroupTimelineBarProps {
  startDate: string;
  endDate: string;
  /** Time-based progress (0–1) — kept for API compat, not used */
  progress: number;
  /** Number of completed fixtures */
  completedCount?: number;
  /** Total number of fixtures */
  totalCount?: number;
  isLoading?: boolean;
}

function GroupTimelineBarInner({
  endDate,
  completedCount = 0,
  totalCount = 0,
  isLoading = false,
}: GroupTimelineBarProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const skeletonOpacity = useSharedValue(0.3);

  const gamesProgress = totalCount > 0 ? completedCount / totalCount : 0;

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, skeletonOpacity]);

  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.track, { backgroundColor: theme.colors.border }, skeletonStyle]}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${gamesProgress * 100}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.row}>
        <AppText style={[styles.label, { color: theme.colors.textSecondary }]}>
          {`${completedCount}/${totalCount} ${t("lobby.summaryCompleted").toLowerCase()}`}
        </AppText>
        <AppText style={[styles.label, { color: theme.colors.textSecondary }]}>
          {format(new Date(endDate), "dd.MM.")}
        </AppText>
      </View>
    </View>
  );
}

export const GroupTimelineBar = React.memo(GroupTimelineBarInner);

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing.xs,
    },
    track: {
      height: 4,
      borderRadius: 2,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: 2,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
    },
  });
