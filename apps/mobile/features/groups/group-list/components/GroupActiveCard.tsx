// features/groups/group-list/components/GroupActiveCard.tsx
// Card component for displaying active/ended groups in the groups list.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import { useCountdown } from "@/features/groups/predictions/hooks";
import type { ApiGroupItem } from "@repo/types";

interface GroupActiveCardProps {
  group: ApiGroupItem;
  onPress: () => void;
  unreadCount?: number;
}

export function GroupActiveCard({ group, onPress, unreadCount = 0 }: GroupActiveCardProps) {
  const { theme } = useTheme();
  const liveGamesCount = group.liveGamesCount ?? 0;
  const todayGamesCount = group.todayGamesCount ?? 0;
  const todayUnpredictedCount = group.todayUnpredictedCount ?? 0;
  const unpredictedGamesCount = group.unpredictedGamesCount ?? 0;
  const countdownLabel = useCountdown(group.nextGame?.kickoffAt ?? null);

  const getStatusBadgeColor = () => {
    switch (group.status) {
      case "active":
        return theme.colors.primary;
      case "ended":
        return theme.colors.surface;
      default:
        return theme.colors.surface;
    }
  };

  const getStatusTextColor = () => {
    switch (group.status) {
      case "active":
        return theme.colors.primaryText;
      case "ended":
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const showInfo =
    group.memberCount !== undefined ||
    group.nextGame ||
    group.lastGame ||
    group.predictionsCount !== undefined ||
    liveGamesCount > 0 ||
    todayGamesCount > 0;

  const isNextGameWithin24h =
    group.nextGame &&
    countdownLabel.startsWith("in ") &&
    countdownLabel !== "—";

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <AppText variant="body" style={styles.groupName}>
            {group.name}
          </AppText>
          {unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText
                variant="caption"
                style={[styles.unreadBadgeText, { color: theme.colors.primaryText }]}
              >
                {unreadCount > 99 ? "99+" : String(unreadCount)}
              </AppText>
            </View>
          )}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusBadgeColor(),
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.statusBadgeText, { color: getStatusTextColor() }]}
            >
              {group.status.toUpperCase()}
            </AppText>
          </View>
        </View>

        {showInfo && (
          <View
            style={[
              styles.groupInfo,
              {
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            {liveGamesCount > 0 && (
              <AppText
                variant="caption"
                style={[
                  styles.infoItem,
                  styles.liveBadge,
                  { color: "#EF4444" },
                ]}
              >
                {liveGamesCount} {liveGamesCount === 1 ? "game" : "games"} LIVE
              </AppText>
            )}

            {todayGamesCount > 0 && (
              <AppText variant="caption" color="secondary" style={styles.infoItem}>
                {todayGamesCount} {todayGamesCount === 1 ? "game" : "games"} today
                {todayUnpredictedCount > 0
                  ? ` – ${todayUnpredictedCount} need predictions`
                  : " – all predictions set"}
              </AppText>
            )}

            {group.memberCount !== undefined && (
              <AppText variant="caption" color="secondary" style={styles.infoItem}>
                {group.memberCount}{" "}
                {group.memberCount === 1 ? "participant" : "participants"}
              </AppText>
            )}

            {group.predictionsCount !== undefined &&
              group.totalFixtures !== undefined && (
                <View>
                  <AppText
                    variant="caption"
                    color="secondary"
                    style={styles.infoItem}
                  >
                    {group.predictionsCount}/{group.totalFixtures} predictions
                    {unpredictedGamesCount > 0 &&
                      ` – ${unpredictedGamesCount} games need predictions`}
                    {unpredictedGamesCount === 0 && " ✓"}
                  </AppText>
                  {group.totalFixtures > 0 && (
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
                            backgroundColor: theme.colors.primary,
                            width: `${(group.predictionsCount / group.totalFixtures) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              )}

            {group.nextGame ? (
              <View style={styles.nextGameRow}>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.infoItem}
                >
                  Next: {group.nextGame.homeTeam?.name || "TBD"} vs{" "}
                  {group.nextGame.awayTeam?.name || "TBD"}
                </AppText>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.nextGameTime}
                >
                  {isNextGameWithin24h
                    ? countdownLabel
                    : `${formatKickoffDate(group.nextGame.kickoffAt)} ${formatKickoffTime(group.nextGame.kickoffAt)}`}
                </AppText>
              </View>
            ) : (
              <AppText
                variant="caption"
                color="secondary"
                style={styles.infoItem}
              >
                No upcoming games
              </AppText>
            )}

            {group.lastGame && (
              <AppText
                variant="caption"
                color="secondary"
                style={styles.infoItem}
              >
                {group.status === "ended"
                  ? `Ended ${formatKickoffDate(group.lastGame.kickoffAt)}`
                  : `Ends ${formatKickoffDate(group.lastGame.kickoffAt)}`}
              </AppText>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupCard: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupName: {
    flex: 1,
    fontWeight: "600",
    marginRight: 12,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 8,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontWeight: "600",
    fontSize: 10,
  },
  groupInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  infoItem: {
    marginBottom: 4,
  },
  nextGameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  nextGameTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  liveBadge: {
    fontWeight: "600",
  },
});
