// features/groups/group-list/components/GroupCard.tsx
// Unified card component for displaying groups in the groups list.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useCountdown } from "@/features/groups/predictions/hooks";
import type { ApiGroupItem } from "@repo/types";

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface GroupCardProps {
  group: ApiGroupItem;
  onPress: () => void;
  unreadCount?: number;
}

const AVATAR_SIZE = 44;

export function GroupCard({ group, onPress, unreadCount = 0 }: GroupCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const initials = getInitials(group.name);
  const liveCount = group.liveGamesCount ?? 0;
  const isDraft = group.status === "draft";

  // Status bar data
  const memberCount = group.memberCount ?? 0;
  const totalFixtures = group.totalFixtures ?? 0;
  const completedGames = group.completedFixturesCount ?? 0;
  const completionPercent = totalFixtures > 0 ? Math.round((completedGames / totalFixtures) * 100) : 0;
  const predictionsCount = group.predictionsCount ?? 0;
  const predictionsPercent = totalFixtures > 0 ? Math.round((predictionsCount / totalFixtures) * 100) : 0;
  const userRank = group.userRank;

  const nextGameKickoff = group.nextGame?.kickoffAt ?? null;
  const countdown = useCountdown(nextGameKickoff);

  // Check if next game is today and has no prediction
  const isNextGameToday = nextGameKickoff
    ? new Date(nextGameKickoff).toDateString() === new Date().toDateString()
    : false;
  const isUrgentPrediction = isNextGameToday && !group.nextGame?.prediction;

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          isDraft && {
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: theme.colors.border,
            opacity: 0.8,
          },
        ]}
      >
        {/* Row 1: Avatar + Info */}
        <View style={[styles.topRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, paddingBottom: 10 }]}>
          <View
            style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          >
            <AppText
              style={[styles.initials, { color: theme.colors.primaryText }]}
            >
              {initials}
            </AppText>
          </View>
          <View style={styles.info}>
            <AppText variant="body" style={styles.name} numberOfLines={1}>
              {group.name}
            </AppText>
            <AppText variant="caption" color="secondary">
              {group.privacy === "public"
                ? t("groups.filterPublic")
                : t("lobby.private")}
            </AppText>
            {isDraft && (
              <AppText
                variant="caption"
                color="secondary"
                style={styles.tapToFinish}
              >
                {t("groups.tapToFinish")}
              </AppText>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textSecondary}
          />
        </View>

        {/* Next game */}
        {!isDraft && group.nextGame && (
          <View style={styles.nextGameRow}>
            <View style={styles.nextGameInfo}>
              <AppText style={[styles.nextGameLabel, { color: theme.colors.textSecondary }]}>
                {t("groups.nextGame")} · {countdown}
              </AppText>
              <AppText style={[styles.nextGameText, { color: theme.colors.text }]}>
                {group.nextGame.homeTeam?.name ?? "?"} - {group.nextGame.awayTeam?.name ?? "?"}
              </AppText>
              {group.nextGame.league?.name && (
                <AppText style={[styles.nextGameLeague, { color: theme.colors.textSecondary }]}>
                  {group.nextGame.league.name}{group.nextGame.country?.iso2 ? ` (${group.nextGame.country.iso2})` : ""}
                </AppText>
              )}
            </View>
            <View style={styles.predictionContainer}>
              {group.nextGame.prediction && (
                <AppText style={[styles.predictionText, { color: theme.colors.text }]}>
                  {group.nextGame.prediction.home}-{group.nextGame.prediction.away}
                </AppText>
              )}
              <View style={[styles.predictionStatus, { backgroundColor: group.nextGame.prediction ? theme.colors.success : (isUrgentPrediction ? theme.colors.danger : theme.colors.warning) }]}>
                <Ionicons
                  name={group.nextGame.prediction ? "checkmark" : "alert"}
                  size={12}
                  color="#fff"
                />
              </View>
            </View>
          </View>
        )}

        {/* Status bar */}
        {!isDraft && (
          <View style={styles.statusBar}>
            {/* Members */}
            <View style={styles.statusItem}>
              <Ionicons
                name="people-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <AppText style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                {memberCount}
              </AppText>
            </View>

            {/* Messages - only show if there are unread */}
            {unreadCount > 0 && (
              <View style={styles.statusItem}>
                <Ionicons
                  name="chatbubble"
                  size={14}
                  color={theme.colors.primary}
                />
                <AppText style={[styles.statusText, { color: theme.colors.primary }]}>
                  +{unreadCount > 99 ? "99" : unreadCount}
                </AppText>
              </View>
            )}

            {/* Ranking */}
            {userRank != null && (
              <View style={styles.statusItem}>
                <Ionicons
                  name="trophy-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <AppText style={[styles.statusText, { color: theme.colors.textSecondary }]}>
                  #{userRank}
                </AppText>
              </View>
            )}

            {/* Predictions */}
            <View style={styles.statusItem}>
              <Ionicons
                name={predictionsCount === totalFixtures ? "checkmark-circle" : (predictionsCount < totalFixtures ? "alert-circle" : "checkmark-circle-outline")}
                size={14}
                color={predictionsCount === totalFixtures ? theme.colors.success : (isUrgentPrediction ? theme.colors.danger : (predictionsCount < totalFixtures ? theme.colors.warning : theme.colors.textSecondary))}
              />
              <AppText style={[styles.statusText, { color: predictionsCount === totalFixtures ? theme.colors.success : (isUrgentPrediction ? theme.colors.danger : (predictionsCount < totalFixtures ? theme.colors.warning : theme.colors.textSecondary)) }]}>
                {predictionsCount}/{totalFixtures} ({predictionsPercent}%)
              </AppText>
            </View>

            {/* Completion or Start Date */}
            <View style={styles.statusItem}>
              <Ionicons
                name={liveCount > 0 ? "football" : "football-outline"}
                size={14}
                color={liveCount > 0 ? theme.colors.primary : theme.colors.textSecondary}
              />
              <AppText style={[styles.statusText, { color: liveCount > 0 ? theme.colors.primary : theme.colors.textSecondary }]}>
                {`${completedGames}/${totalFixtures} (${completionPercent}%)`}
              </AppText>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    padding: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  tapToFinish: {
    marginTop: 2,
  },
  name: {
    fontWeight: "600",
  },
  nextGameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  nextGameInfo: {
    flex: 1,
  },
  nextGameLabel: {
    fontSize: 11,
  },
  nextGameText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  nextGameLeague: {
    fontSize: 11,
    marginTop: 2,
  },
  predictionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  predictionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  predictionStatus: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
