import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GamesSummaryCard } from "./GamesSummaryCard";
import { GroupGamesSkeleton } from "./GroupGamesSkeleton";

type Props = {
  isReady: boolean;
  emptyState: { message: string; suggestion?: { label: string; action: () => void } } | null;
  filteredFixturesCount: number;
  totalPoints: number;
  predictedCount: number;
  totalCount: number;
  accuracy: number;
};

export const GroupGamesListHeader = React.memo(function GroupGamesListHeader({
  isReady,
  emptyState,
  filteredFixturesCount,
  totalPoints,
  predictedCount,
  totalCount,
  accuracy,
}: Props) {
  const { theme } = useTheme();

  if (!isReady) {
    return <GroupGamesSkeleton />;
  }
  if (emptyState && filteredFixturesCount === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <AppText
          variant="body"
          color="secondary"
          style={styles.emptyStateMessage}
        >
          {emptyState.message}
        </AppText>
        {emptyState.suggestion && (
          <AppText
            variant="body"
            style={[
              styles.emptyStateSuggestion,
              { color: theme.colors.primary },
            ]}
            onPress={emptyState.suggestion.action}
          >
            {emptyState.suggestion.label}
          </AppText>
        )}
      </View>
    );
  }
  return (
    <GamesSummaryCard
      totalPoints={totalPoints}
      predictedCount={predictedCount}
      totalCount={totalCount}
      accuracy={accuracy}
    />
  );
});

const styles = StyleSheet.create({
  emptyStateContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStateMessage: {
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSuggestion: {
    fontWeight: "600",
  },
});
