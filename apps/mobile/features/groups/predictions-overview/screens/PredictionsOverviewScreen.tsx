// features/groups/predictions-overview/screens/PredictionsOverviewScreen.tsx
// Screen component for predictions overview.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ActivityIndicator } from "react-native";
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

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <AppText variant="body" color="secondary" style={styles.loadingText}>
          {t("predictionsOverview.loadingPredictions")}
        </AppText>
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
  loadingText: {
    marginTop: 12,
  },
});
