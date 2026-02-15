import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, isLoading } = useMyPredictionsForFixture(fixtureId);
  const allList = data?.data ?? [];
  // Show only predictions from other groups (exclude current group)
  const list =
    currentGroupId != null
      ? allList.filter((item) => item.groupId !== currentGroupId)
      : allList;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { borderTopWidth: 0 }]}>
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      </View>
    );
  }
  if (list.length === 0 && currentGroupId == null) return null;

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border, flex: 1 }]}>
      {list.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="football-outline"
            size={48}
            color={theme.colors.textSecondary}
            style={styles.emptyIcon}
          />
          <AppText variant="body" color="secondary" style={styles.emptyText}>
            {t("predictions.noPredictionsFromOtherGroups")}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.emptySubtext}>
            {t("predictions.noPredictionsSubtitle", { defaultValue: "Your predictions from other groups for this game will appear here" })}
          </AppText>
        </View>
      ) : (
        list.map((item: ApiMyPredictionForFixtureItem) => (
          <View
            key={item.groupId}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <AppText variant="body" numberOfLines={1} style={styles.groupName}>
              {item.groupName}
            </AppText>
            <AppText variant="body" style={styles.score}>
              {formatScore(item.prediction)}
            </AppText>
          </View>
        ))
      )}
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    paddingHorizontal: 32,
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
