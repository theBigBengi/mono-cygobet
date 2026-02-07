// features/groups/group-lobby/components/LobbyLeaderboard.tsx
// Unified leaderboard: Top 3 + user's position if not in top 3, with "View ranking" link.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiRankingItem } from "@repo/types";
import { LobbyCardSkeleton } from "./LobbyCardSkeleton";

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const TOP_COUNT = 3;

export interface LobbyLeaderboardProps {
  ranking: ApiRankingItem[] | undefined;
  currentUserId: number | null;
  isLoading: boolean;
  onPress: () => void;
}

export function LobbyLeaderboard({
  ranking,
  currentUserId,
  isLoading,
  onPress,
}: LobbyLeaderboardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const allRanking = ranking ?? [];
  const top = allRanking.slice(0, TOP_COUNT);

  // Find current user's row
  const userRow = currentUserId
    ? allRanking.find((r) => r.userId === currentUserId)
    : null;
  const userInTop3 = userRow ? userRow.rank <= TOP_COUNT : false;

  if (isLoading) {
    return <LobbyCardSkeleton height={140} />;
  }

  if (top.length === 0) {
    return (
      <View style={styles.section}>
        <AppText
          variant="caption"
          color="secondary"
          style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
        >
          {t("lobby.leaderboard")}
        </AppText>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppText variant="caption" color="secondary" style={styles.pending}>
            {t("lobby.rankingPending")}
          </AppText>
        </View>
      </View>
    );
  }

  const renderRow = (
    item: ApiRankingItem,
    index: number,
    showBorder: boolean,
    showMedal: boolean
  ) => {
    const isCurrentUser =
      currentUserId != null && item.userId === currentUserId;
    const displayName = isCurrentUser
      ? t("lobby.you")
      : (item.username ?? `#${item.rank}`);
    return (
      <View
        key={item.userId}
        style={[
          styles.row,
          showBorder && {
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
          },
          isCurrentUser && {
            backgroundColor: theme.colors.primary + "15",
          },
        ]}
      >
        {showMedal ? (
          <AppText style={styles.medal}>{MEDALS[index] ?? ""}</AppText>
        ) : (
          <AppText
            variant="caption"
            style={[styles.rankNum, { color: theme.colors.textSecondary }]}
          >
            #{item.rank}
          </AppText>
        )}
        <AppText
          variant="body"
          numberOfLines={1}
          style={[
            styles.name,
            {
              color: theme.colors.textPrimary,
              fontWeight: isCurrentUser ? "700" : "500",
            },
          ]}
        >
          {displayName}
        </AppText>
        <AppText
          variant="caption"
          style={[styles.points, { color: theme.colors.textSecondary }]}
        >
          {item.totalPoints} {t("lobby.pts")}
        </AppText>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <AppText
        variant="caption"
        color="secondary"
        style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
      >
        {t("lobby.leaderboard")}
      </AppText>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        {/* Top 3 */}
        {top.map((item, index) => renderRow(item, index, index > 0, true))}

        {/* User's position if not in top 3 */}
        {userRow && !userInTop3 && (
          <>
            <View
              style={[styles.separator, { borderColor: theme.colors.border }]}
            >
              <View
                style={[styles.dots, { backgroundColor: theme.colors.border }]}
              />
            </View>
            {renderRow(userRow, userRow.rank - 1, false, false)}
          </>
        )}

        {/* View ranking link */}
        <View style={[styles.viewRow, { borderTopColor: theme.colors.border }]}>
          <AppText
            variant="caption"
            style={[styles.viewLink, { color: theme.colors.primary }]}
          >
            {t("lobby.viewRanking")}
          </AppText>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.primary}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.8,
  },
  pending: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  medal: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  rankNum: {
    width: 28,
    fontWeight: "600",
    textAlign: "center",
  },
  name: {
    flex: 1,
    minWidth: 0,
  },
  points: {
    fontWeight: "600",
  },
  separator: {
    alignItems: "center",
    paddingVertical: 4,
    borderTopWidth: 1,
  },
  dots: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  viewLink: {
    fontWeight: "600",
  },
});
