// features/groups/group-lobby/screens/GroupLobbyEndedScreen.tsx
// Ended state screen for group lobby.
// Shows group ended banner, ranking, fixtures with final scores, and predictions overview.
// Read-only; no invite section or prediction editing.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
import { useUnreadCountsQuery } from "@/domains/groups";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyFixturesSection,
  useGroupDuration,
  type FixtureItem,
} from "../index";
import { formatDate } from "@/utils/date";

interface GroupLobbyEndedScreenProps {
  group: ApiGroupItem;
  onRefresh: () => Promise<void>;
}

/**
 * Group Lobby Ended Screen
 *
 * Screen component for viewing a group in ended status.
 * Shows banner, ranking, fixtures with final scores, and predictions overview.
 * No invite section; read-only.
 */
export function GroupLobbyEndedScreen({
  group,
  onRefresh,
}: GroupLobbyEndedScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const { data: unreadData } = useUnreadCountsQuery();
  const chatUnreadCount = unreadData?.data?.[String(group.id)] ?? 0;

  const fixtures =
    Array.isArray((group as any).fixtures)
      ? ((group as any).fixtures as FixtureItem[])
      : [];

  const duration = useGroupDuration(fixtures);

  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

  const handleViewRanking = () => {
    router.push(`/groups/${group.id}/ranking` as any);
  };

  const handleViewMembers = () => {
    router.push(`/groups/${group.id}/members` as any);
  };

  const handleViewChat = () => {
    router.push(`/groups/${group.id}/chat` as any);
  };

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        {/* Group Ended Banner */}
        <Card style={styles.bannerCard}>
          <AppText variant="body" style={styles.bannerText}>
            {duration
              ? t("lobby.groupEndedDuration", {
                  count: duration.durationDays as number,
                  start: formatDate(duration.startDate),
                  end: formatDate(duration.endDate),
                })
              : t("lobby.groupEnded")}
          </AppText>
        </Card>

        {/* Fixtures Section with final scores */}
        <GroupLobbyFixturesSection
          onViewAll={handleViewAllGames}
          fixtures={fixtures}
          groupId={group.id}
          showFixtureCards={true}
          showFinalScores={true}
        />

        {/* Ranking Section */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewRanking}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.bannerText}>
              Ranking
            </AppText>
          </Pressable>
        </Card>

        {/* Members Section */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewMembers}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.bannerText}>
              Members
            </AppText>
          </Pressable>
        </Card>

        {/* Chat Section (read-only for ended groups) */}
        <Card style={styles.bannerCard}>
          <Pressable
            onPress={handleViewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.chatRow}>
              <AppText variant="body" style={styles.bannerText}>
                Chat
              </AppText>
              {chatUnreadCount > 0 && (
                <View
                  style={[
                    styles.chatUnreadBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.chatUnreadText,
                      { color: theme.colors.primaryText },
                    ]}
                  >
                    {chatUnreadCount > 99 ? "99+" : String(chatUnreadCount)}
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>
        </Card>

        {/* Predictions Overview Section */}
        <Card style={styles.predictionsOverviewCard}>
          <Pressable
            onPress={handleViewPredictionsOverview}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" style={styles.predictionsOverviewText}>
              Predictions Overview
            </AppText>
          </Pressable>
        </Card>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContent: {
    paddingBottom: 16,
  },
  bannerCard: {
    marginBottom: 16,
  },
  bannerText: {
    fontWeight: "600",
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chatUnreadText: {
    fontSize: 11,
    fontWeight: "700",
  },
  predictionsOverviewCard: {
    marginBottom: 16,
  },
  predictionsOverviewText: {
    fontWeight: "600",
  },
});
