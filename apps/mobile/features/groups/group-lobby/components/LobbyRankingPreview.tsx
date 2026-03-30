// features/groups/group-lobby/components/LobbyRankingPreview.tsx
// Minimalist Top 3 ranking preview in the lobby.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme, spacing, radius } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";
import { LobbyCardSkeleton } from "./LobbyCardSkeleton";

export interface LobbyRankingPreviewProps {
  /** Full ranking list (component shows top 3). */
  ranking: ApiRankingItem[] | undefined;
  /** True while ranking is being fetched. Shows skeleton instead of content. */
  isLoading?: boolean;
  onPress: () => void;
}

const TOP_COUNT = 3;

/**
 * Returns true when there are no points yet (all totalPoints are 0).
 */
function hasNoPoints(ranking: ApiRankingItem[] | undefined): boolean {
  if (!ranking || ranking.length === 0) return true;
  return ranking.every((r) => r.totalPoints === 0);
}

export function LobbyRankingPreview({
  ranking,
  isLoading = false,
  onPress,
}: LobbyRankingPreviewProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const showPending = !isLoading && hasNoPoints(ranking);
  const topThree = (ranking ?? []).slice(0, TOP_COUNT);

  if (isLoading) {
    return <LobbyCardSkeleton height={80} />;
  }

  const renderContent = () => {
    if (showPending) {
      return (
        <AppText variant="caption" color="secondary" style={styles.pendingText}>
          {t("lobby.rankingPending")}
        </AppText>
      );
    }
    return (
      <View style={styles.rows}>
        {topThree.map((item) => (
          <View
            key={item.userId}
            style={[
              styles.rowInner,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.rank, { color: theme.colors.textSecondary }]}
            >
              #{item.rank}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={[styles.name, { color: theme.colors.textPrimary }]}
            >
              {item.username ?? `Player #${item.rank}`}
            </AppText>
            <AppText
              variant="caption"
              style={[styles.points, { color: theme.colors.textSecondary }]}
            >
              {item.totalPoints} {t("lobby.pts")}
            </AppText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        {/* Header row: icon + title */}
        <View style={styles.headerRow}>
          <FontAwesome6
            name="ranking-star"
            size={20}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <AppText
            variant="body"
            style={[styles.title, { flex: 1, color: theme.colors.textPrimary }]}
          >
            {t("lobby.ranking")}
          </AppText>
        </View>
        {/* Content: skeleton / pending message / ranking rows */}
        <View>{renderContent()}</View>
        {!showPending && (
          <View
            style={[
              styles.viewAllButton,
              { backgroundColor: theme.colors.primary + "30" },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.viewAllText, { color: theme.colors.primary }]}
            >
              {t("lobby.viewAll").toUpperCase()}
            </AppText>
          </View>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.ms,
    marginBottom: spacing.sm,
  },
  icon: {
    marginEnd: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  pendingText: {
    marginTop: 0,
  },
  rows: {
    gap: spacing.xs,
    paddingTop: spacing.ms,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.s,
  },
  rank: {
    width: spacing.lg,
    fontWeight: "600",
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  points: {
    fontWeight: "500",
  },
  viewAllButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.ms,
    borderRadius: radius.full,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
