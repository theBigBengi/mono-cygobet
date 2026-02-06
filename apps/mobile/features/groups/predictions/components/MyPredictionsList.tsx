import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { useMyPredictionsForFixture } from "@/domains/fixtures";
import type { ApiMyPredictionForFixtureItem } from "@repo/types";

type Props = {
  fixtureId: number;
  /** Current group context (optional, e.g. to highlight the active group). */
  currentGroupId?: number | null;
};

function formatScore(
  prediction: ApiMyPredictionForFixtureItem["prediction"]
): string {
  if (!prediction) return "-:-";
  return `${prediction.home}:${prediction.away}`;
}

export function MyPredictionsList({ fixtureId, currentGroupId }: Props) {
  const { theme } = useTheme();
  const { data, isLoading } = useMyPredictionsForFixture(fixtureId);
  const list = data?.data ?? [];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }
  if (list.length === 0) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <AppText
        variant="caption"
        color="secondary"
        style={[styles.header, { color: theme.colors.textSecondary }]}
      >
        Your predictions for this game
      </AppText>
      {list.map((item: ApiMyPredictionForFixtureItem) => {
        const isCurrentGroup =
          currentGroupId != null && item.groupId === currentGroupId;
        return (
          <View
            key={item.groupId}
            style={[
              styles.row,
              {
                backgroundColor: isCurrentGroup
                  ? theme.colors.primary + "14"
                  : theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="body" numberOfLines={1} style={styles.groupName}>
              {item.groupName}
            </AppText>
            <AppText
              variant="body"
              style={[
                styles.score,
                isCurrentGroup && {
                  fontWeight: "700",
                  color: theme.colors.primary,
                },
              ]}
            >
              {formatScore(item.prediction)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    marginTop: 8,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  header: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  groupName: {
    flex: 1,
    marginRight: 12,
  },
  score: {
    fontSize: 16,
    minWidth: 36,
    textAlign: "right",
  },
});
