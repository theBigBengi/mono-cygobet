// features/groups/predictions-overview/screens/PredictionsOverviewScreen.tsx
// Screen component for predictions overview.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { usePredictionsOverviewQuery } from "@/domains/groups";
import { PredictionsOverviewTable } from "../components/PredictionsOverviewTable";

interface PredictionsOverviewScreenProps {
  groupId: number | null;
}

/**
 * PredictionsOverviewScreen component
 *
 * Fetches and displays predictions overview for a group.
 * Shows loading and error states appropriately.
 */
export function PredictionsOverviewScreen({
  groupId,
}: PredictionsOverviewScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { data, isLoading, error } = usePredictionsOverviewQuery(groupId);

  const skeletonOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, skeletonOpacity]);
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.skeletonContainer}>
        {/* Header skeleton */}
        <View style={styles.skeletonHeaderRow}>
          <Animated.View style={[{ width: 120, height: 14, borderRadius: 6, backgroundColor: theme.colors.border }, skeletonStyle]} />
        </View>
        {/* Row skeletons */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <Animated.View style={[{ width: 20, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
            <Animated.View style={[{ width: 80, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
            <View style={{ flex: 1 }} />
            <Animated.View style={[{ width: 30, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
          </View>
        ))}
      </View>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <AppText variant="body" color="danger">
          {t("predictionsOverview.failedLoadPredictions")}
        </AppText>
      </View>
    );
  }

  const overviewData = data.data;

  // Empty state
  if (
    overviewData.participants.length === 0 ||
    overviewData.fixtures.length === 0
  ) {
    return (
      <View style={styles.centerContainer}>
        <AppText variant="body" color="secondary">
          {t("predictionsOverview.noDataAvailable", {
            participants: overviewData.participants.length,
            fixtures: overviewData.fixtures.length,
          })}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PredictionsOverviewTable data={overviewData} groupId={groupId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonHeaderRow: {
    marginBottom: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
});
