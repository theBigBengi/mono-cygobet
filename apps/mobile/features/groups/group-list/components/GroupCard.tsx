// features/groups/group-list/components/GroupCard.tsx
// Unified card component for displaying groups in the groups list.
// Styled to match the lobby and games screen design patterns.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
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

const AVATAR_SIZE = 48;

export function GroupCard({ group, onPress, unreadCount = 0 }: GroupCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const initials = getInitials(group.name);
  const liveCount = group.liveGamesCount ?? 0;
  const isDraft = group.status === "draft";
  const isEnded = group.status === "ended";

  // Status bar data
  const memberCount = group.memberCount ?? 0;
  const totalFixtures = group.totalFixtures ?? 0;
  const completedGames = group.completedFixturesCount ?? 0;
  const predictionsCount = group.predictionsCount ?? 0;
  const userRank = group.userRank;

  const nextGameKickoff = group.nextGame?.kickoffAt ?? null;
  const countdown = useCountdown(nextGameKickoff);

  // Check if next game is today and has no prediction
  const isNextGameToday = nextGameKickoff
    ? new Date(nextGameKickoff).toDateString() === new Date().toDateString()
    : false;
  const isUrgentPrediction = isNextGameToday && !group.nextGame?.prediction;

  // Status color - same as lobby
  const getStatusColor = () => {
    if (isDraft) return theme.colors.warning;
    if (isEnded) return theme.colors.textSecondary;
    if (liveCount > 0) return "#EF4444"; // Live red
    return theme.colors.primary; // Primary for active (like lobby)
  };

  const statusColor = getStatusColor();

  const handlePressIn = () => {
    setIsPressed(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            styles.cardShadowWrapper,
            {
              shadowColor: "#000",
              shadowOpacity: isPressed ? 0 : 0.12,
            },
            isPressed && styles.cardPressed,
          ]}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
              },
              isDraft && styles.cardDraft,
            ]}
          >
            {/* Top Row: Avatar + Info + Chevron */}
            <View style={styles.topRow}>
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <Text style={[styles.initials, { color: theme.colors.primaryText }]}>
                  {initials}
                </Text>
              </View>

              <View style={styles.info}>
                <Text
                  style={[styles.name, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {group.name}
                </Text>
                {/* League mode badge */}
                {group.selectionMode === "leagues" && group.nextGame?.league && (
                  <View style={[styles.modeBadge, { backgroundColor: theme.colors.primary + "12", borderColor: theme.colors.primary + "30" }]}>
                    <View style={[styles.modeIcon, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="trophy-outline" size={10} color={theme.colors.primaryText} />
                    </View>
                    <Text style={[styles.modeText, { color: theme.colors.primary }]} numberOfLines={1}>
                      {group.nextGame.league.name}
                    </Text>
                  </View>
                )}
                {/* Teams mode badge */}
                {group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0 && (
                  <View style={[styles.modeBadge, { backgroundColor: theme.colors.primary + "12", borderColor: theme.colors.primary + "30" }]}>
                    <View style={[styles.modeIcon, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="shirt-outline" size={10} color={theme.colors.primaryText} />
                    </View>
                    <Text style={[styles.modeText, { color: theme.colors.primary }]} numberOfLines={1}>
                      {group.groupTeams.map((t) => t.shortCode ?? t.name.slice(0, 3).toUpperCase()).join(", ")}
                    </Text>
                  </View>
                )}
                {/* Games mode badge */}
                {group.selectionMode === "games" && totalFixtures > 0 && (
                  <View style={[styles.modeBadge, { backgroundColor: theme.colors.primary + "12", borderColor: theme.colors.primary + "30" }]}>
                    <View style={[styles.modeIcon, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="grid-outline" size={10} color={theme.colors.primaryText} />
                    </View>
                    <Text style={[styles.modeText, { color: theme.colors.primary }]}>
                      {t("groups.freePick")}
                    </Text>
                  </View>
                )}
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>

            {/* Next Game Row (for active groups) */}
            {!isDraft && !isEnded && group.nextGame && (
              <View
                style={[
                  styles.nextGameRow,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.nextGameInfo}>
                  <Text
                    style={[
                      styles.nextGameLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("groups.nextGame")} · {countdown}
                  </Text>
                  <Text
                    style={[
                      styles.nextGameText,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {group.nextGame.homeTeam?.name ?? "?"} - {group.nextGame.awayTeam?.name ?? "?"}
                  </Text>
                </View>
                {/* Mini score boxes with team logos */}
                <View style={styles.predictionBoxes}>
                  {/* Home team */}
                  <View style={styles.teamPrediction}>
                    <Text style={[styles.teamCode, { color: theme.colors.textSecondary }]}>
                      {group.nextGame.homeTeam?.shortCode ?? "H"}
                    </Text>
                    <View
                      style={[
                        styles.scoreBox,
                        {
                          backgroundColor: isUrgentPrediction
                            ? "#EF4444" + "15"
                            : theme.colors.surface,
                          borderColor: isUrgentPrediction
                            ? "#EF4444" + "40"
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: isUrgentPrediction
                              ? "#EF4444"
                              : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {group.nextGame.prediction?.home ?? "–"}
                      </Text>
                    </View>
                  </View>
                  {/* Away team */}
                  <View style={styles.teamPrediction}>
                    <Text style={[styles.teamCode, { color: theme.colors.textSecondary }]}>
                      {group.nextGame.awayTeam?.shortCode ?? "A"}
                    </Text>
                    <View
                      style={[
                        styles.scoreBox,
                        {
                          backgroundColor: isUrgentPrediction
                            ? "#EF4444" + "15"
                            : theme.colors.surface,
                          borderColor: isUrgentPrediction
                            ? "#EF4444" + "40"
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: isUrgentPrediction
                              ? "#EF4444"
                              : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {group.nextGame.prediction?.away ?? "–"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Stats HUD (for active/ended groups) */}
            {!isDraft && (
              <View style={styles.statsHud}>
                {/* Members */}
                <View style={[styles.hudCell, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="people" size={16} color={theme.colors.primary} />
                  <Text style={[styles.hudValue, { color: theme.colors.textPrimary }]}>
                    {memberCount}
                  </Text>
                  <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
                    {t("groups.membersShort")}
                  </Text>
                </View>

                {/* Rank */}
                <View style={[styles.hudCell, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={[styles.hudValue, { color: theme.colors.textPrimary }]}>
                    {userRank != null ? `#${userRank}` : "—"}
                  </Text>
                  <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
                    {t("groups.rankShort")}
                  </Text>
                </View>

                {/* Predictions */}
                <View
                  style={[
                    styles.hudCell,
                    {
                      backgroundColor: predictionsCount === totalFixtures
                        ? "#10B981" + "15"
                        : isUrgentPrediction
                          ? "#EF4444" + "15"
                          : theme.colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={predictionsCount === totalFixtures ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={
                      predictionsCount === totalFixtures
                        ? "#10B981"
                        : isUrgentPrediction
                          ? "#EF4444"
                          : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.hudValue,
                      {
                        color: predictionsCount === totalFixtures
                          ? "#10B981"
                          : isUrgentPrediction
                            ? "#EF4444"
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {predictionsCount}/{totalFixtures}
                  </Text>
                  <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
                    {t("groups.predictionsShort")}
                  </Text>
                </View>

                {/* Games */}
                <View
                  style={[
                    styles.hudCell,
                    {
                      backgroundColor: liveCount > 0 ? "#EF4444" + "15" : theme.colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="football"
                    size={16}
                    color={liveCount > 0 ? "#EF4444" : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.hudValue,
                      { color: liveCount > 0 ? "#EF4444" : theme.colors.textPrimary },
                    ]}
                  >
                    {completedGames}/{totalFixtures}
                  </Text>
                  <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
                    {t("groups.gamesShort")}
                  </Text>
                </View>

                {/* Chat */}
                {unreadCount > 0 && (
                  <View
                    style={[
                      styles.hudCell,
                      { backgroundColor: theme.colors.primary + "15" },
                    ]}
                  >
                    <Ionicons name="chatbubble" size={16} color={theme.colors.primary} />
                    <Text style={[styles.hudValue, { color: theme.colors.primary }]}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                    <Text style={[styles.hudLabel, { color: theme.colors.textSecondary }]}>
                      {t("groups.chatShort")}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Draft hint */}
            {isDraft && (
              <View
                style={[
                  styles.draftHint,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <Ionicons
                  name="construct-outline"
                  size={14}
                  color={theme.colors.warning}
                />
                <Text
                  style={[
                    styles.draftHintText,
                    { color: theme.colors.warning },
                  ]}
                >
                  {t("groups.tapToFinish")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardShadowWrapper: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardPressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  cardDraft: {
    borderStyle: "dashed",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  initials: {
    fontSize: 18,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingLeft: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  modeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  nextGameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 14,
    paddingBottom: 2,
    borderTopWidth: 1,
  },
  nextGameInfo: {
    flex: 1,
  },
  nextGameLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  nextGameText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  predictionBoxes: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  teamPrediction: {
    alignItems: "center",
    gap: 2,
  },
  teamCode: {
    fontSize: 9,
    fontWeight: "600",
  },
  scoreBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statsHud: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  hudCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 2,
  },
  hudValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  draftHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  draftHintText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
