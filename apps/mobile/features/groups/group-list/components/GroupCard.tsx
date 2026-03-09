// features/groups/group-list/components/GroupCard.tsx
// Clean, flat group card — minimalist design inspired by the lobby.

import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import { isLive as isLiveState } from "@repo/utils";
import type { ApiGroupItem } from "@repo/types";

export interface GroupCardProps {
  group: ApiGroupItem;
  onPress: (groupId: number) => void;
  onGamesPress?: (groupId: number) => void;
  unreadCount?: number;
  unreadActivityCount?: number;
  isHudLoading?: boolean;
}

const AVATAR_SIZE = 48;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function GroupCardInner({
  group,
  onPress,
  onGamesPress,
  unreadCount = 0,
  unreadActivityCount = 0,
}: GroupCardProps) {
  const { theme } = useTheme();
  const initials = getInitials(group.name);
  const userRank = group.userRank;
  const nextGame = group.nextGame;
  const liveCount = group.liveGamesCount ?? 0;
  const isLive = liveCount > 0;
  const totalUnread = unreadCount;
  const totalFixtures = group.totalFixtures ?? 0;
  const predictionsCount = group.predictionsCount ?? 0;
  const unpredicted = totalFixtures - predictionsCount;
  const hasPrediction = nextGame?.prediction?.home != null && nextGame?.prediction?.away != null;

  const subtitle = useMemo(() => {
    if (group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0) {
      return group.groupTeams.map((t) => t.shortCode ?? t.name).join(" · ");
    }
    if (group.selectionMode === "leagues" && nextGame?.league) {
      return nextGame.league.name;
    }
    if (group.selectionMode === "games" && (group.totalFixtures ?? 0) > 0) {
      return "Free Pick";
    }
    return `${group.memberCount ?? 0} members`;
  }, [group, nextGame]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(group.id);
  };

  const handleGamesPress = () => {
    if (onGamesPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onGamesPress(group.id);
    }
  };

  // Status box for next game date/time
  const statusBox = useMemo(() => {
    if (!nextGame?.kickoffAt) return null;

    if (isLive) {
      return {
        topText: String(nextGame.liveMinute ?? ""),
        bottomText: "Live",
        color: theme.colors.live,
        topIsSmall: false,
      };
    }

    const k = new Date(nextGame.kickoffAt);
    const now = new Date();
    const isToday =
      k.getDate() === now.getDate() &&
      k.getMonth() === now.getMonth() &&
      k.getFullYear() === now.getFullYear();

    if (isToday) {
      const hasPred = nextGame.prediction?.home != null && nextGame.prediction?.away != null;
      const diff = k.getTime() - now.getTime();
      const urgentColor = !hasPred ? theme.colors.danger : theme.colors.textPrimary;

      if (diff <= 0) {
        return {
          topText: k.getHours().toString().padStart(2, "0"),
          bottomText: k.getMinutes().toString().padStart(2, "0"),
          color: urgentColor,
          topIsSmall: false,
        };
      }
      const totalMin = Math.floor(diff / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return {
        topText: h > 0 ? `${h}h` : String(m),
        bottomText: h > 0 ? `${m}m` : "min",
        color: urgentColor,
        topIsSmall: false,
      };
    }

    return {
      topText: MONTHS[k.getMonth()],
      bottomText: String(k.getDate()),
      color: theme.colors.textPrimary,
      topIsSmall: true,
    };
  }, [nextGame, isLive, theme]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { borderBottomColor: theme.colors.border },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={group.name}
    >
      {/* Row 1: Avatar + Name + Indicators */}
      <View style={styles.header}>
        <GroupAvatar
          avatarType={group.avatarType}
          avatarValue={group.avatarValue}
          initials={initials}
          size={AVATAR_SIZE}
          borderRadius={4}
          flat
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {group.name}
            </Text>
            {group.isOfficial && (
              <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
            )}
          </View>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <View style={styles.indicators}>
          {userRank != null && (
            <View style={[styles.rankBadge, { backgroundColor: theme.colors.textSecondary + "12" }]}>
              <Text style={[styles.rankText, { color: theme.colors.textPrimary }]}>
                #{userRank}
              </Text>
            </View>
          )}
          {totalUnread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.unreadText}>
                {totalUnread > 99 ? "99+" : totalUnread}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 2: Next game */}
      {nextGame && statusBox && (
        <Pressable
          onPress={handleGamesPress}
          disabled={!onGamesPress}
          style={({ pressed }) => [
            styles.nextGameRow,
            pressed && onGamesPress && { opacity: 0.6 },
          ]}
        >
          <View
            style={[
              styles.statusBox,
              { backgroundColor: (statusBox.color) + "12" },
            ]}
          >
            <Text
              style={[
                statusBox.topIsSmall ? styles.statusSmallText : styles.statusLargeText,
                { color: statusBox.color },
              ]}
            >
              {statusBox.topText}
            </Text>
            <Text style={[styles.statusSmallText, { color: statusBox.color + "70" }]}>
              {statusBox.bottomText}
            </Text>
          </View>

          <View style={styles.teams}>
            <Text
              style={[styles.teamName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {nextGame.homeTeam?.name ?? "TBD"}
            </Text>
            <Text
              style={[styles.teamName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {nextGame.awayTeam?.name ?? "TBD"}
            </Text>
          </View>

          <View style={styles.nextGameRight}>
            {hasPrediction ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.colors.success + "20" }]}>
                <Ionicons name="checkmark" size={12} color={theme.colors.success} />
              </View>
            ) : (
              <View style={[styles.checkCircle, { borderWidth: 1.5, borderColor: theme.colors.textSecondary + "40" }]}>
                <Ionicons name="add" size={12} color={theme.colors.textSecondary} />
              </View>
            )}
          </View>
        </Pressable>
      )}

      {/* Unpredicted games count */}
      {unpredicted > 0 && (
        <Text style={[styles.unpredictedText, { color: theme.colors.danger }]}>
          {unpredicted} unpredicted
        </Text>
      )}
    </Pressable>
  );
}

export const GroupCard = React.memo(GroupCardInner, (prev, next) => {
  return (
    prev.group === next.group &&
    prev.unreadCount === next.unreadCount &&
    prev.unreadActivityCount === next.unreadActivityCount &&
    prev.onPress === next.onPress &&
    prev.onGamesPress === next.onGamesPress
  );
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  indicators: {
    alignItems: "flex-end",
    gap: 4,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "800",
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  nextGameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  statusBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLargeText: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 19,
  },
  statusSmallText: {
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
  },
  teams: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 13,
    fontWeight: "600",
  },
  nextGameRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unpredictedText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    marginStart: 52,
  },
});
