// features/groups/group-list/components/GroupActiveCard.tsx
// Card component for displaying active/ended groups in the groups list.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Card } from "@/components/ui";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useTheme } from "@/lib/theme";
import { formatKickoffDate, formatKickoffTime } from "@/utils/fixture";
import { useCountdown } from "@/features/groups/predictions/hooks";
import type { ApiGroupItem } from "@repo/types";
import { MemberCountBadge } from "./MemberCountBadge";

interface GroupActiveCardProps {
  group: ApiGroupItem;
  onPress: () => void;
  unreadCount?: number;
}

export function GroupActiveCard({
  group,
  onPress,
  unreadCount = 0,
}: GroupActiveCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const liveGamesCount = group.liveGamesCount ?? 0;
  const unpredictedGamesCount = group.unpredictedGamesCount ?? 0;
  const predictionsCount = group.predictionsCount ?? 0;
  const totalFixtures = group.totalFixtures ?? 0;
  const countdownLabel = useCountdown(group.nextGame?.kickoffAt ?? null);

  const progress =
    totalFixtures > 0 ? Math.min(1, predictionsCount / totalFixtures) : 0;
  const isNextGameSoon =
    group.nextGame &&
    countdownLabel !== "—" &&
    (countdownLabel.startsWith("in ") ||
      countdownLabel.startsWith("Today") ||
      countdownLabel.startsWith("Tomorrow"));

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

  const getCardStyle = () => {
    if (group.status === "active") {
      return { borderColor: theme.colors.primary, borderWidth: 1.5 };
    }
    if (group.status === "ended") {
      return { opacity: 0.85 };
    }
    return {};
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.groupCard, getCardStyle()]}>
        <View style={styles.groupHeader}>
          <AppText variant="body" style={styles.groupName} numberOfLines={1}>
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
                style={[
                  styles.unreadBadgeText,
                  { color: theme.colors.primaryText },
                ]}
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
              {t(`lobby.${group.status}`)}
            </AppText>
          </View>
        </View>

        <View style={[styles.infoRow, { borderTopColor: theme.colors.border }]}>
          <View style={styles.infoRowFirst}>
            {group.memberCount !== undefined && group.memberCount > 0 && (
              <>
                <MemberCountBadge
                  count={group.memberCount}
                  size={20}
                  maxVisible={3}
                />
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.infoSpacer}
                >
                  {" "}
                  {group.memberCount}{" "}
                  {t("lobby.participant", { count: group.memberCount })}
                </AppText>
              </>
            )}
            {group.nextGame && (
              <>
                {group.memberCount !== undefined && group.memberCount > 0 && (
                  <AppText variant="caption" color="secondary">
                    {" "}
                    ·{" "}
                  </AppText>
                )}
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                  style={styles.iconInline}
                />
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.infoText}
                >
                  {isNextGameSoon
                    ? t("lobby.nextGameLabel", { countdown: countdownLabel })
                    : ` ${formatKickoffDate(group.nextGame.kickoffAt)} ${formatKickoffTime(group.nextGame.kickoffAt)}`}
                </AppText>
              </>
            )}
          </View>
        </View>

        {totalFixtures > 0 && (
          <View style={styles.progressRow}>
            <CircularProgress
              progress={progress}
              size={40}
              strokeWidth={3}
              color={
                group.status === "active"
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
              showLabel
            />
            <View style={styles.progressTextWrap}>
              <AppText variant="caption" color="secondary">
                {t("lobby.predictionsCount", {
                  done: predictionsCount,
                  total: totalFixtures,
                })}
                {unpredictedGamesCount > 0 && (
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.danger }}
                  >
                    {" · "}
                    {t("lobby.gamesNeedPredictions", {
                      count: unpredictedGamesCount,
                    })}
                  </AppText>
                )}
              </AppText>
            </View>
          </View>
        )}

        {liveGamesCount > 0 && (
          <View style={styles.liveRow}>
            <View
              style={[styles.liveDot, { backgroundColor: theme.colors.danger }]}
            />
            <AppText
              variant="caption"
              style={[styles.liveText, { color: theme.colors.danger }]}
            >
              {liveGamesCount} {t("lobby.game", { count: liveGamesCount })}{" "}
              {t("lobby.gamesLive")}
            </AppText>
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
    marginBottom: 12,
  },
  groupName: {
    flex: 1,
    fontWeight: "600",
    marginEnd: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginEnd: 8,
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
  infoRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 10,
  },
  infoRowFirst: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  iconInline: {
    marginRight: 2,
  },
  infoSpacer: {
    marginLeft: 4,
  },
  infoText: {
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveText: {
    fontWeight: "600",
  },
});
