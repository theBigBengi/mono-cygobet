// features/groups/group-list/components/GroupCard.tsx
// Unified card component for displaying groups in the groups list.
// Styled to match the lobby and games screen design patterns.

import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText, GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useCountdown } from "@/features/groups/predictions/hooks";
import type { ApiGroupItem } from "@repo/types";

function formatLastMessageTime(isoDate: string | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}w`;
}

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
  onPress: (groupId: number) => void;
  unreadCount?: number;
  unreadActivityCount?: number;
  isHudLoading?: boolean;
}

const AVATAR_SIZE = 56;

// ─── HUD Cell Sub-components ──────────────────────────────────────────

interface RankingHudCellProps {
  rankChange: number;
  userRank: number | null | undefined;
  textSecondary: string;
}

const RankingHudCell = React.memo(function RankingHudCellInner({
  rankChange,
  userRank,
  textSecondary,
}: RankingHudCellProps) {
  const isLit = rankChange !== 0;
  const isUp = rankChange > 0;
  const rankColor = isUp ? "#10B981" : "#EF4444";
  return (
    <View style={styles.hudCell}>
      <Ionicons
        name={isLit ? "trophy" : "trophy-outline"}
        size={16}
        color={isLit ? rankColor : textSecondary + "50"}
      />
      <Text
        style={[
          styles.hudValue,
          {
            color: isLit ? rankColor : textSecondary + "50",
          },
        ]}
      >
        {userRank ? `#${userRank}` : "–"}
      </Text>
      {isLit && (
        <View style={styles.rankChangeIndicator}>
          <Ionicons
            name={isUp ? "caret-up" : "caret-down"}
            size={12}
            color={rankColor}
          />
        </View>
      )}
    </View>
  );
});

interface PredictionsHudCellProps {
  totalFixtures: number;
  predictionsCount: number;
  urgencyColor: string | null;
  textSecondary: string;
}

const PredictionsHudCell = React.memo(function PredictionsHudCellInner({
  totalFixtures,
  predictionsCount,
  urgencyColor,
  textSecondary,
}: PredictionsHudCellProps) {
  const missingCount = totalFixtures - predictionsCount;
  const isComplete = totalFixtures > 0 && missingCount === 0;
  const hasUrgency = !isComplete && urgencyColor;
  const litColor = urgencyColor;
  return (
    <View
      style={[
        styles.hudCell,
        {
          backgroundColor: hasUrgency ? litColor + "15" : "transparent",
        },
      ]}
    >
      <MaterialCommunityIcons
        name={isComplete ? "notebook-check-outline" : "notebook-edit-outline"}
        size={16}
        color={
          hasUrgency
            ? litColor!
            : isComplete
              ? "#10B981"
              : textSecondary + "50"
        }
      />
      <Text
        style={[
          styles.hudValue,
          {
            color: hasUrgency
              ? litColor!
              : textSecondary + "50",
          },
        ]}
      >
        {hasUrgency ? `${missingCount}/${totalFixtures}` : `${predictionsCount}/${totalFixtures}`}
      </Text>
    </View>
  );
});

interface GamesHudCellProps {
  liveCount: number;
  totalFixtures: number;
  completedGames: number;
  textSecondary: string;
}

const GamesHudCell = React.memo(function GamesHudCellInner({
  liveCount,
  totalFixtures,
  completedGames,
  textSecondary,
}: GamesHudCellProps) {
  const isLit = liveCount > 0;
  const allCompleted = totalFixtures > 0 && completedGames === totalFixtures;
  const liveColor = "#EC4899";
  return (
    <View
      style={[
        styles.hudCell,
        {
          backgroundColor: isLit ? liveColor + "15" : "transparent",
        },
      ]}
    >
      <MaterialCommunityIcons
        name={
          isLit
            ? "timeline-alert-outline"
            : allCompleted
              ? "timeline-check-outline"
              : "timeline-clock-outline"
        }
        size={16}
        color={
          isLit
            ? liveColor
            : allCompleted
              ? "#10B981"
              : textSecondary + "50"
        }
      />
      <Text
        style={[
          styles.hudValue,
          {
            color: isLit ? liveColor : textSecondary + "50",
          },
        ]}
      >
        {isLit ? "LIVE" : `${completedGames}/${totalFixtures}`}
      </Text>
    </View>
  );
});

interface ChatHudCellProps {
  unreadCount: number;
  lastMessageAt: string | undefined;
  primaryColor: string;
  textSecondary: string;
}

const ChatHudCell = React.memo(function ChatHudCellInner({
  unreadCount,
  lastMessageAt,
  primaryColor,
  textSecondary,
}: ChatHudCellProps) {
  const isLit = unreadCount > 0;
  const lastMsgTime = formatLastMessageTime(lastMessageAt);
  return (
    <View style={styles.hudCell}>
      <Ionicons
        name={isLit ? "chatbubble" : "chatbubble-outline"}
        size={16}
        color={isLit ? primaryColor : textSecondary + "50"}
      />
      {isLit && (
        <Text style={[styles.hudValue, { color: primaryColor }]}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </Text>
      )}
    </View>
  );
});

interface ActivityHudCellProps {
  unreadActivityCount: number;
  primaryColor: string;
  textSecondary: string;
}

const ActivityHudCell = React.memo(function ActivityHudCellInner({
  unreadActivityCount,
  primaryColor,
  textSecondary,
}: ActivityHudCellProps) {
  const isLit = unreadActivityCount > 0;
  return (
    <View style={styles.hudCell}>
      <Ionicons
        name={isLit ? "notifications" : "notifications-outline"}
        size={16}
        color={isLit ? primaryColor : textSecondary + "50"}
      />
      {isLit && (
        <Text style={[styles.hudValue, { color: primaryColor }]}>
          {unreadActivityCount > 99 ? "99+" : unreadActivityCount}
        </Text>
      )}
    </View>
  );
});

// ─── HUD Skeleton ─────────────────────────────────────────────────────

function HudSkeleton({ borderColor }: { borderColor: string }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={pulseStyle}>
      <View style={styles.hudSkeletonRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.hudSkeletonCell}>
            <View style={[styles.hudSkeletonIcon, { backgroundColor: borderColor }]} />
            <View style={[styles.hudSkeletonText, { backgroundColor: borderColor }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── NextGameRow Sub-component ────────────────────────────────────────

interface NextGameRowProps {
  nextGame: NonNullable<ApiGroupItem["nextGame"]>;
  urgencyColor: string | null;
  textSecondary: string;
  textPrimary: string;
  borderColor: string;
  surfaceColor: string;
  onPredictPress: () => void;
}

const NextGameRow = React.memo(function NextGameRowInner({
  nextGame,
  urgencyColor,
  textSecondary,
  textPrimary,
  borderColor,
  surfaceColor,
  onPredictPress,
}: NextGameRowProps) {
  const { t } = useTranslation("common");
  const countdown = useCountdown(nextGame.kickoffAt ?? null);
  const hasPrediction = !!nextGame.prediction;

  return (
    <View
      style={[
        styles.nextGameRow,
        { borderTopColor: borderColor },
      ]}
    >
      <Text
        style={[
          styles.nextGameLabel,
          { color: textSecondary },
        ]}
      >
        {t("groups.nextGame")} · {countdown}
      </Text>
      <View style={styles.nextGameMainRow}>
        <Text
          style={[
            styles.nextGameText,
            { color: textPrimary, flex: 1 },
          ]}
          numberOfLines={1}
        >
          {nextGame.homeTeam?.name ?? "?"} - {nextGame.awayTeam?.name ?? "?"}
        </Text>
      {hasPrediction ? (
        <View style={styles.predictionBoxes}>
          {/* Home team */}
          <View style={styles.teamPrediction}>
            <Text style={[styles.teamCode, { color: textSecondary }]}>
              {nextGame.homeTeam?.shortCode ?? "H"}
            </Text>
            <View
              style={[
                styles.scoreBox,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  { color: textPrimary },
                ]}
              >
                {nextGame.prediction?.home}
              </Text>
            </View>
          </View>
          {/* Away team */}
          <View style={styles.teamPrediction}>
            <Text style={[styles.teamCode, { color: textSecondary }]}>
              {nextGame.awayTeam?.shortCode ?? "A"}
            </Text>
            <View
              style={[
                styles.scoreBox,
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreText,
                  { color: textPrimary },
                ]}
              >
                {nextGame.prediction?.away}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onPredictPress}
          style={({ pressed }) => [
            styles.predictButton,
            {
              borderColor: borderColor,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="notebook-edit-outline"
            size={14}
            color={textPrimary}
          />
          <Text
            style={[
              styles.predictButtonText,
              { color: textPrimary },
            ]}
          >
            {t("predictions.predict")}
          </Text>
        </Pressable>
      )}
      </View>
    </View>
  );
});

// ─── GroupCard ─────────────────────────────────────────────────────────

function GroupCardInner({ group, onPress, unreadCount = 0, unreadActivityCount = 0, isHudLoading = false }: GroupCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
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

  // Memoize theme-dependent inline style objects
  const cardStyles = useMemo(() => ({
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderColor: theme.colors.border,
      borderBottomColor: theme.colors.textSecondary + "40",
    },
    avatar: {
      backgroundColor: theme.colors.primary,
      shadowColor: "#000",
    },
    initials: { color: theme.colors.primaryText },
    name: { color: theme.colors.textPrimary },
    statsHud: { borderTopColor: theme.colors.border },
    badgeBg: { backgroundColor: theme.colors.textSecondary + "15" },
    badgeText: { color: theme.colors.textSecondary },
    draftHint: { borderTopColor: theme.colors.border },
  }), [theme]);

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
    onPress(group.id);
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
              cardStyles.card,
              isDraft && styles.cardDraft,
            ]}
          >
            {/* Top Row: Avatar + Info + Chevron */}
            <View style={styles.topRow}>
              <GroupAvatar
                avatarType={group.avatarType}
                avatarValue={group.avatarValue}
                initials={initials}
                size={AVATAR_SIZE}
                borderRadius={14}
              />

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.name, cardStyles.name, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {group.name}
                  </Text>
                  {group.isOfficial && (
                    <View style={styles.officialBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
                    </View>
                  )}
                </View>
                {/* League mode subtitle */}
                {group.selectionMode === "leagues" && group.nextGame?.league && (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {group.nextGame.league.name}
                  </Text>
                )}
                {/* Teams mode subtitle */}
                {group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0 && (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {group.groupTeams.map((team) => team.shortCode ?? team.name.slice(0, 3).toUpperCase()).join(", ")}
                  </Text>
                )}
                {/* Games mode subtitle */}
                {group.selectionMode === "games" && totalFixtures > 0 && (
                  <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {t("groups.freePick")}
                  </Text>
                )}
              </View>

              {/* Right side: Role & Privacy badges */}
              <View style={styles.rightBadges}>
                {/* Role badge */}
                <View
                  style={[
                    styles.roleBadge,
                    cardStyles.badgeBg,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      cardStyles.badgeText,
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
                    cardStyles.badgeBg,
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
              <NextGameRow
                nextGame={group.nextGame}
                urgencyColor={urgencyColor}
                textSecondary={theme.colors.textSecondary}
                textPrimary={theme.colors.textPrimary}
                borderColor={theme.colors.border}
                surfaceColor={theme.colors.surface}
                onPredictPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/groups/${group.id}/fixtures/${group.nextGame!.id}` as any);
                }}
              />
            )}

            {/* Alert HUD - skeleton while unread data loads, real cells after */}
            {!isDraft && !isEnded && (
              <View style={[styles.statsHud, cardStyles.statsHud]}>
                {isHudLoading ? (
                  <HudSkeleton borderColor={theme.colors.border} />
                ) : (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.hudInner}>
                    <RankingHudCell
                      rankChange={group.userRankChange ?? 0}
                      userRank={userRank}
                      textSecondary={theme.colors.textSecondary}
                    />
                    <ActivityHudCell
                      unreadActivityCount={unreadActivityCount}
                      primaryColor={theme.colors.primary}
                      textSecondary={theme.colors.textSecondary}
                    />
                    <ChatHudCell
                      unreadCount={unreadCount}
                      lastMessageAt={group.lastMessageAt}
                      primaryColor={theme.colors.primary}
                      textSecondary={theme.colors.textSecondary}
                    />
                  </Animated.View>
                )}
              </View>
            )}

            {/* Draft hint */}
            {isDraft && (
              <View
                style={[
                  styles.draftHint,
                  cardStyles.draftHint,
                ]}
              >
                <Ionicons
                  name="construct-outline"
                  size={16}
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

export const GroupCard = React.memo(GroupCardInner, (prev, next) => {
  return (
    prev.group === next.group &&
    prev.unreadCount === next.unreadCount &&
    prev.unreadActivityCount === next.unreadActivityCount &&
    prev.isHudLoading === next.isHudLoading &&
    prev.onPress === next.onPress
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardShadowWrapper: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardPressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ scale: 0.98 }, { translateY: 2 }],
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 3,
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
    gap: 14,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  officialBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4A01720",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  nextGameRow: {
    marginTop: 14,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  nextGameMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
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
  predictButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderBottomWidth: 3,
  },
  predictButtonText: {
    fontSize: 11,
    fontWeight: "600",
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
    marginTop: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  hudCell: {
    flex: 1,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 3,
    overflow: "hidden",
  },
  rankChangeIndicator: {
    marginLeft: -2,
  },
  hudValue: {
    fontSize: 12,
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
  hudInner: {
    flexDirection: "row",
    flex: 1,
    gap: 2,
  },
  hudSkeletonRow: {
    flexDirection: "row",
    flex: 1,
    gap: 2,
  },
  hudSkeletonCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  hudSkeletonIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  hudSkeletonText: {
    width: 24,
    height: 12,
    borderRadius: 4,
  },
});
