// features/groups/group-list/components/GroupDateProgressBar.tsx
// Progress bar showing time elapsed in group based on start/end dates.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

const SECONDS_PER_DAY = 86400;

interface GroupDateProgressBarProps {
  /** Start date (ISO string) */
  startDate: string;
  /** End date (ISO string) */
  endDate: string;
}

/**
 * Displays progress through a group's time range (start to end date).
 * Uses muted styling to distinguish from the predictions progress bar in the lobby.
 */
export function GroupDateProgressBar({
  startDate,
  endDate,
}: GroupDateProgressBarProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const { progressPercent, currentDay, totalDays } = useMemo(() => {
    const startTs = new Date(startDate).getTime() / 1000;
    const endTs = new Date(endDate).getTime() / 1000;
    const now = Date.now() / 1000;

    const totalSeconds = endTs - startTs;
    if (totalSeconds <= 0) {
      return { progressPercent: 100, currentDay: 1, totalDays: 1 };
    }

    const elapsedSeconds = now - startTs;
    const progressPercent = Math.min(
      100,
      Math.max(0, (elapsedSeconds / totalSeconds) * 100)
    );

    const totalDays = Math.max(1, Math.ceil(totalSeconds / SECONDS_PER_DAY));
    const currentDay = Math.min(
      totalDays,
      Math.max(1, Math.ceil(elapsedSeconds / SECONDS_PER_DAY))
    );

    return { progressPercent, currentDay, totalDays };
  }, [startDate, endDate]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons
          name="calendar-outline"
          size={12}
          color={theme.colors.textSecondary}
          style={styles.icon}
        />
        <AppText variant="caption" color="secondary" style={styles.label}>
          {t("lobby.dateProgress", { current: currentDay, total: totalDays })}
        </AppText>
      </View>
      <View
        style={[
          styles.progressTrack,
          { backgroundColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: theme.colors.textSecondary,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    marginEnd: 4,
  },
  label: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});
