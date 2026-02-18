// features/groups/group-list/components/GroupCard.tsx
// Unified card component for displaying groups in the groups list.
// Styled to match the lobby and games screen design patterns.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, Image, ScrollView } from "react-native";
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

const AVATAR_SIZE = 56;

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
  const hasPrediction = !!group.nextGame?.prediction;

  // Prediction urgency levels based on time until kickoff
  const getUrgencyLevel = (): "none" | "week" | "tomorrow" | "today" => {
    if (!nextGameKickoff || hasPrediction) return "none";

    const now = new Date();
    const kickoff = new Date(nextGameKickoff);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrow = new Date(todayStart);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const weekFromNow = new Date(todayStart);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    if (kickoff < tomorrowStart) return "today";
    if (kickoff < dayAfterTomorrow) return "tomorrow";
    if (kickoff < weekFromNow) return "week";
    return "none";
  };

  const urgencyLevel = getUrgencyLevel();

  // Colors for each urgency level
  const URGENCY_COLORS = {
    none: null,
    week: "#EAB308",    // Yellow
    tomorrow: "#F97316", // Orange
    today: "#EF4444",    // Red
  };

  const urgencyColor = URGENCY_COLORS[urgencyLevel];

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
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
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
                    shadowColor: "#000",
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
                  <View style={[styles.modeBadge, { backgroundColor: theme.colors.textSecondary + "15", borderColor: theme.colors.textSecondary + "30" }]}>
                    {group.nextGame.league.imagePath ? (
                      <View style={[styles.modeIcon, { backgroundColor: theme.colors.surface }]}>
                        <Image
                          source={{ uri: group.nextGame.league.imagePath }}
                          style={styles.leagueLogo}
                        />
                      </View>
                    ) : (
                      <View style={[styles.modeIcon, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="trophy-outline" size={10} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.modeText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {group.nextGame.league.name}
                    </Text>
                  </View>
                )}
                {/* Teams mode badges */}
                {group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.teamBadgesScroll}
                    contentContainerStyle={styles.teamBadgesRow}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {group.groupTeams.map((team) => (
                      <Pressable
                        key={team.id}
                        onPress={() => {}}
                        style={[styles.teamBadge, { backgroundColor: theme.colors.textSecondary + "15", borderColor: theme.colors.textSecondary + "30" }]}
                      >
                        {team.imagePath ? (
                          <View style={[styles.teamLogoContainer, { backgroundColor: theme.colors.surface }]}>
                            <Image
                              source={{ uri: team.imagePath }}
                              style={styles.teamLogo}
                            />
                          </View>
                        ) : (
                          <View style={[styles.teamLogoContainer, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="football-outline" size={10} color={theme.colors.textSecondary} />
                          </View>
                        )}
                        <Text style={[styles.teamBadgeText, { color: theme.colors.textSecondary }]}>
                          {team.shortCode ?? team.name.slice(0, 3).toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                {/* Games mode badge */}
                {group.selectionMode === "games" && totalFixtures > 0 && (
                  <View style={[styles.modeBadge, { backgroundColor: theme.colors.textSecondary + "15", borderColor: theme.colors.textSecondary + "30" }]}>
                    <View style={[styles.modeIcon, { backgroundColor: theme.colors.surface }]}>
                      <Ionicons name="grid-outline" size={10} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.modeText, { color: theme.colors.textSecondary }]}>
                      {t("groups.freePick")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Right side: Role & Privacy badges */}
              <View style={styles.rightBadges}>
                {/* Role badge */}
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: theme.colors.textSecondary + "15" },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {group.userRole === "owner"
                      ? "C"
                      : group.userRole === "admin"
                        ? "A"
                        : "M"}
                  </Text>
                </View>
                {/* Privacy badge */}
                <View
                  style={[
                    styles.privacyBadge,
                    { backgroundColor: theme.colors.textSecondary + "15" },
                  ]}
                >
                  <Ionicons
                    name={group.privacy === "private" ? "lock-closed" : "globe-outline"}
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                </View>
              </View>
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
                          backgroundColor: urgencyColor
                            ? urgencyColor + "15"
                            : theme.colors.surface,
                          borderColor: urgencyColor
                            ? urgencyColor + "40"
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: urgencyColor ?? theme.colors.textPrimary,
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
                          backgroundColor: urgencyColor
                            ? urgencyColor + "15"
                            : theme.colors.surface,
                          borderColor: urgencyColor
                            ? urgencyColor + "40"
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: urgencyColor ?? theme.colors.textPrimary,
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
              <View style={[styles.statsHud, { borderTopColor: theme.colors.border }]}>
                {/* Members */}
                <View style={[styles.hudCell, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.hudValue, { color: theme.colors.textSecondary }]}>
                    {memberCount}
                  </Text>
                </View>

                {/* Rank */}
                <View style={[styles.hudCell, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="trophy" size={16} color={theme.colors.textSecondary} />
                  <Text style={[styles.hudValue, { color: theme.colors.textSecondary }]}>
                    {userRank != null ? `#${userRank}` : "—"}
                  </Text>
                </View>

                {/* Predictions */}
                <View
                  style={[
                    styles.hudCell,
                    {
                      backgroundColor: predictionsCount === totalFixtures
                        ? "#10B981" + "15"
                        : urgencyColor
                          ? urgencyColor + "15"
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
                        : urgencyColor ?? theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.hudValue,
                      {
                        color: predictionsCount === totalFixtures
                          ? "#10B981"
                          : urgencyColor ?? theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {predictionsCount}/{totalFixtures}
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
                      { color: liveCount > 0 ? "#EF4444" : theme.colors.textSecondary },
                    ]}
                  >
                    {completedGames}/{totalFixtures}
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
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 0,
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
    fontSize: 20,
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
  teamBadgesScroll: {
    marginTop: 4,
    marginHorizontal: -4,
    maxWidth: "75%",
  },
  teamBadgesRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
  },
  teamBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  teamLogoContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  teamLogo: {
    width: 14,
    height: 14,
  },
  leagueLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  nextGameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
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
    borderBottomWidth: 3,
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
    marginHorizontal: -14,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  hudCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
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
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  draftHintText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rightBadges: {
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  roleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
  },
  privacyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
