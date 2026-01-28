// features/groups/predictions-overview/screens/PredictionsOverviewScreen.tsx
// Screen component for predictions overview.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
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
  const { data, isLoading, error } = usePredictionsOverviewQuery(groupId);

  // Loading state
  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message="Loading predictions overview..." />
      </Screen>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView message="Failed to load predictions overview" />
      </Screen>
    );
  }

  const overviewData = data.data;

  // Debug: log data to see what we have
  console.log("Predictions Overview Data:", {
    participantsCount: overviewData.participants.length,
    fixturesCount: overviewData.fixtures.length,
    totalWidth: overviewData.fixtures.length * 100,
  });

  // Empty state
  if (
    overviewData.participants.length === 0 ||
    overviewData.fixtures.length === 0
  ) {
    return (
      <Screen>
        <AppText variant="body" color="secondary">
          No predictions data available. Participants: {overviewData.participants.length}, Fixtures: {overviewData.fixtures.length}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentContainerStyle={styles.screenContent}>
      <PredictionsOverviewTable data={overviewData} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    padding: 0,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
});
