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
  const progress =
    (group.totalFixtures ?? 0) > 0
      ? (group.completedFixturesCount ?? 0) / (group.totalFixtures ?? 1)
      : 0;
  const liveCount = group.liveGamesCount ?? 0;
  const isDraft = group.status === "draft";

  const kickoffAt =
    group.nextGame?.kickoffAt ?? group.firstGame?.kickoffAt ?? null;
  const countdownLabel = useCountdown(kickoffAt);
  const nextLabel = countdownLabel !== "—" ? countdownLabel : null;

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
          isDraft && {
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: theme.colors.border,
            opacity: 0.8,
          },
        ]}
      >
        {/* Row 1: Avatar + Info */}
        <View style={styles.topRow}>
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
            <View style={styles.nameRow}>
              <AppText variant="body" style={styles.name} numberOfLines={1}>
                {group.name}
              </AppText>
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <AppText style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="caption" color="secondary">
              {group.memberCount ?? 0}{" "}
              {t("lobby.participant", { count: group.memberCount ?? 0 })}
              {nextLabel && ` · ${nextLabel}`}
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

        {/* Row 2: Progress (only for active/ended) */}
        {!isDraft && (group.totalFixtures ?? 0) > 0 && (
          <View style={styles.progressSection}>
            <View
              style={[styles.track, { backgroundColor: theme.colors.border }]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor:
                      progress === 1
                        ? theme.colors.success
                        : theme.colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <AppText variant="caption" color="secondary">
                {t("lobby.gamesProgress", {
                  done: group.completedFixturesCount ?? 0,
                  total: group.totalFixtures ?? 0,
                })}
              </AppText>
              <AppText variant="caption" color="secondary">
                {Math.round(progress * 100)}%
              </AppText>
            </View>
          </View>
        )}

        {/* Row 3: Live badge */}
        {liveCount > 0 && (
          <View style={styles.liveRow}>
            <View
              style={[styles.liveDot, { backgroundColor: theme.colors.danger }]}
            />
            <AppText
              variant="caption"
              style={{ color: theme.colors.danger, fontWeight: "600" }}
            >
              {liveCount} {t("lobby.gamesLive")}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  progressSection: {
    marginTop: 12,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
