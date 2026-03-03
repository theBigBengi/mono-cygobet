// features/groups/group-list/components/GroupCard.tsx
// Unified card component for displaying groups in the groups list.
// Styled to match the lobby and games screen design patterns.

import React, { useRef, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons, MaterialCommunityIcons, FontAwesome6, Feather } from "@expo/vector-icons";
import { Dimensions } from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  useFrameCallback,
  interpolate,
  Extrapolation,
  measure,
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

const AVATAR_SIZE = 62;

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

// ─── Pulsing Predict Text ─────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get("window").height;
const PULSE_START = SCREEN_HEIGHT * 0.20;
const PULSE_END = SCREEN_HEIGHT * 0.50;

function PulsingPredictText({ color, isActive }: { color: string; isActive: Animated.SharedValue<number> }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 700 }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: isActive.value === 1 ? opacity.value : 1,
  }));

  return (
    <Animated.Text
      style={[
        styles.predictButtonText,
        { color },
        style,
      ]}
    >
      Predict game
    </Animated.Text>
  );
}


// ─── NextGameRow Sub-component ────────────────────────────────────────

interface NextGameRowProps {
  nextGame: NonNullable<ApiGroupItem["nextGame"]>;
  selectionMode: ApiGroupItem["selectionMode"];
  isLive: boolean;
  liveCount: number;
  extraGames?: NonNullable<ApiGroupItem["fixtures"]>;
  urgencyColor: string | null;
  textSecondary: string;
  textPrimary: string;
  borderColor: string;
  surfaceColor: string;
  primaryColor: string;
  userRank: number | undefined;
  unreadCount: number;
  unreadActivityCount: number;
  lastMessageAt: string | undefined;
  onPredictPress: () => void;
}

const SELECTION_MODE_ICON: Record<string, { name: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }> = {
  teams: { name: "tshirt-crew-outline" },
  leagues: { name: "trophy-outline" },
  games: { name: "gesture-tap" },
};

const NextGameRow = React.memo(function NextGameRowInner({
  nextGame,
  selectionMode,
  isLive,
  liveCount,
  extraGames,
  urgencyColor,
  textSecondary,
  textPrimary,
  borderColor,
  surfaceColor,
  primaryColor,
  userRank,
  unreadCount,
  unreadActivityCount,
  lastMessageAt,
  onPredictPress,
}: NextGameRowProps) {
  const { t } = useTranslation("common");
  const countdown = useCountdown(nextGame.kickoffAt ?? null);
  const hasPrediction = !!nextGame.prediction;

  const animatedRef = useAnimatedRef<Animated.View>();
  const isInRange = useSharedValue(0);

  useFrameCallback(() => {
    const measurement = measure(animatedRef);
    if (measurement) {
      isInRange.value = measurement.pageY >= PULSE_START && measurement.pageY <= PULSE_END ? 1 : 0;
    }
  });

  const rowStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isInRange.value === 1 ? 1 : 0.4, { duration: 200 }),
  }));

  return (
    <View
      style={styles.nextGameRow}
    >
      <Text
        style={[
          styles.nextGameLabel,
          { color: textPrimary, fontWeight: "700" },
        ]}
        numberOfLines={1}
      >
        {extraGames ? `${extraGames.length + 1} games in ${countdown}` : `Next ${countdown}`}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nextGameCardsScroll} contentContainerStyle={styles.nextGameCardsContent}>
        <View style={[styles.nextGameCard, { backgroundColor: borderColor + "80" }]}>
          <View style={styles.nextGameCardTeams}>
            <Text style={[styles.nextGameMatchNames, { color: textSecondary }]} numberOfLines={1}>
              {nextGame.homeTeam?.name ?? "?"}
            </Text>
            <Text style={[styles.nextGameMatchNames, { color: textSecondary }]} numberOfLines={1}>
              {nextGame.awayTeam?.name ?? "?"}
            </Text>
          </View>
          <View style={styles.nextGameCardDateTime}>
            <Text style={[styles.nextGameCardDate, { color: textSecondary }]}>
              {new Date(nextGame.kickoffAt).toLocaleDateString([], { day: "numeric", month: "short" })}
            </Text>
            <Text style={[styles.nextGameCardTime, { color: textSecondary }]}>
              {new Date(nextGame.kickoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
        {extraGames?.map((g) => (
          <View key={g.id} style={[styles.nextGameCard, { backgroundColor: borderColor + "80" }]}>
            <View style={styles.nextGameCardTeams}>
              <Text style={[styles.nextGameMatchNames, { color: textSecondary }]} numberOfLines={1}>
                {g.homeTeam?.name ?? "?"}
              </Text>
              <Text style={[styles.nextGameMatchNames, { color: textSecondary }]} numberOfLines={1}>
                {g.awayTeam?.name ?? "?"}
              </Text>
            </View>
            <View style={styles.nextGameCardDateTime}>
              <Text style={[styles.nextGameCardDate, { color: textSecondary }]}>
                {new Date(g.kickoffAt).toLocaleDateString([], { day: "numeric", month: "short" })}
              </Text>
              <Text style={[styles.nextGameCardTime, { color: textSecondary }]}>
                {new Date(g.kickoffAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <Animated.View ref={animatedRef} style={[styles.nextGameMainRow, rowStyle]}>
        <View style={styles.inlineHud}>
          {userRank != null && (
            <View style={[styles.rankSquare, { borderColor: textPrimary }]}>
              <Text style={[styles.rankSquareText, { color: textPrimary }]}>
                #{userRank}
              </Text>
            </View>
          )}
          {unreadCount > 0 && (
            <Ionicons name="chatbubbles-outline" size={20} color={textPrimary} />
          )}
          {unreadActivityCount > 0 && (
            <MaterialCommunityIcons name="bell-outline" size={20} color={textPrimary} />
          )}
          {isLive && (
            <Ionicons name="radio" size={20} color={textPrimary} />
          )}
        </View>
      {hasPrediction ? (
        <View style={[styles.predictedCircle, { backgroundColor: textPrimary }]}>
          <Feather name="check-square" size={18} color="#FFFFFF" />
        </View>
      ) : (
        <Pressable
          onPress={onPredictPress}
          style={({ pressed }) => [
            styles.predictButton,
            { backgroundColor: pressed ? textPrimary + "CC" : textPrimary },
          ]}
        >
          <FontAwesome6 name="pen-to-square" size={18} color="#FFFFFF" />
          <PulsingPredictText color="#FFFFFF" isActive={isInRange} />
        </Pressable>
      )}
      </Animated.View>
    </View>
  );
});

// ─── GroupCard ─────────────────────────────────────────────────────────

function GroupCardInner({ group, onPress, unreadCount = 0, unreadActivityCount = 0, isHudLoading = false }: GroupCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

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

  // Fixtures sharing the same kickoff as nextGame
  const sameKickoffFixtures = useMemo(() => {
    if (!group.fixtures || !group.nextGame) return [];
    const nextKickoff = group.nextGame.kickoffAt;
    return group.fixtures.filter((f) => f.state === "NS" && f.kickoffAt === nextKickoff && f.id !== group.nextGame!.id);
  }, [group.fixtures, group.nextGame]);
  const hasMultipleGames = sameKickoffFixtures.length > 0;

  // Memoize theme-dependent inline style objects
  const cardStyles = useMemo(() => ({
    shadowWrapper: {
      backgroundColor: "transparent",
    },
    card: {
      backgroundColor: "transparent",
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(group.id);
  };

  const handleMorePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sheetRef.current?.present();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Top Row: Avatar + Info + More button */}
        <View style={styles.topRow}>
          <Pressable onPress={handlePress} style={styles.topRowLeft}>
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
              {group.selectionMode === "teams" && group.groupTeams && group.groupTeams.length > 0 && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                  Team Pick: {group.groupTeams.map((t) => t.name).join(" · ")}
                </Text>
              )}
              {group.selectionMode === "leagues" && group.nextGame?.league && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  League Pick: {group.nextGame.league.name}
                </Text>
              )}
              {group.selectionMode === "games" && totalFixtures > 0 && (
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  Free Pick
                </Text>
              )}
            </View>
          </Pressable>

          <Pressable onPress={handleMorePress} style={styles.moreButton}>
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Next Game Row (for active groups) */}
        {!isDraft && !isEnded && group.nextGame && (
          <NextGameRow
            nextGame={group.nextGame}
            selectionMode={group.selectionMode}
            isLive={liveCount > 0}
            liveCount={liveCount}
            extraGames={hasMultipleGames ? sameKickoffFixtures : undefined}
            urgencyColor={urgencyColor}
            textSecondary={theme.colors.textSecondary}
            textPrimary={theme.colors.textPrimary}
              borderColor={theme.colors.border}
              surfaceColor={theme.colors.surface}
              primaryColor={theme.colors.primary}
              userRank={userRank}
              unreadCount={unreadCount}
              unreadActivityCount={unreadActivityCount}
              lastMessageAt={group.lastMessageAt}
              onPredictPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/groups/${group.id}/fixtures/${group.nextGame!.id}` as any);
              }}
          />
        )}

        {/* Draft hint */}
        {isDraft && (
          <Pressable onPress={handlePress}>
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
          </Pressable>
        )}
      </View>

      {/* Bottom sheet drawer */}
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={[styles.drawerContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>
            {group.name}
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
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
  topRowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  card: {
    borderRadius: 0,
    paddingTop: 14,
    paddingHorizontal: 0,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#00000015",
  },
  cardDraft: {
    borderStyle: "dashed",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
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
    paddingRight: "10%",
  },
  nextGameRow: {
    marginTop: 14,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 12,
  },
  nextGameMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  moreButton: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
  },
  rankSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rankSquareText: {
    fontSize: 11,
    fontWeight: "900",
  },
  inlineHud: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  nextGameLabel: {
    fontSize: 13,
    fontWeight: "700",
    paddingRight: "10%",
  },
  nextGameCardsScroll: {
    marginTop: 6,
  },
  nextGameCardsContent: {
    gap: 8,
  },
  nextGameCard: {
    width: 185,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextGameCardTeams: {
    flex: 1,
    gap: 4,
  },
  nextGameMatchNames: {
    fontSize: 12,
    fontWeight: "600",
  },
  nextGameCardDateTime: {
    alignItems: "center",
    marginLeft: 8,
    gap: 2,
  },
  nextGameCardDate: {
    fontSize: 10,
    fontWeight: "500",
  },
  nextGameCardTime: {
    fontSize: 11,
    fontWeight: "700",
  },
  nextGameText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  predictedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  predictButton: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  predictButtonText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
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
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
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
  drawerContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
});
