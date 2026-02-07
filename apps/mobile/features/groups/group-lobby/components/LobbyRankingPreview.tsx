// features/groups/group-lobby/components/LobbyRankingPreview.tsx
// Minimalist Top 3 ranking preview in the lobby.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
              { borderTopColor: theme.colors.border },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.viewAllText, { color: theme.colors.primary }]}
            >
              {t("lobby.viewAll")}
            </AppText>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.primary}
            />
          </View>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    marginRight: 0,
  },
  title: {
    fontWeight: "600",
  },
  pendingText: {
    marginTop: 0,
  },
  rows: {
    gap: 4,
    paddingTop: 12,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  rank: {
    width: 24,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewAllText: {
    fontWeight: "600",
  },
});
