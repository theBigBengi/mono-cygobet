// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby.
// Shows fixtures and meta information.
// Group name is displayed in the header instead.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
import { useGroupRankingQuery } from "@/domains/groups";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyFixturesSection,
  type FixtureItem,
} from "../index";

interface GroupLobbyActiveScreenProps {
  /**
   * Group data (includes fixtures when fetched with includeFixtures)
   */
  group: ApiGroupItem;
  /**
   * Callback to refresh all data
   */
  onRefresh: () => Promise<void>;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
}

/**
 * Group Lobby Active Screen
 * 
 * Screen component for viewing a group in active status.
 * Shows fixtures and meta information.
 * Group name is displayed in the header instead.
 */
export function GroupLobbyActiveScreen({
  group,
  onRefresh,
  isCreator,
}: GroupLobbyActiveScreenProps) {
  const router = useRouter();
  const { data: rankingData } = useGroupRankingQuery(group.id);

  const leader = rankingData?.data?.[0];

  // Derive fixtures from group.fixtures
  const fixtures =
    Array.isArray((group as any).fixtures) ? ((group as any).fixtures as FixtureItem[]) : [];

  // Progress: use API stats when present, otherwise derive from fixtures (getGroupById doesn't return these)
  const totalFixtures = group.totalFixtures ?? fixtures.length;
  const predictionsCount =
    group.predictionsCount ??
    fixtures.filter((f) => f.prediction != null && f.prediction !== undefined).length;

  // Handler for navigating to games (Predictions banner opens games page)
  const handleViewGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  // Handler for navigating to predictions overview
  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

  // Handler for navigating to ranking
  const handleViewRanking = () => {
    router.push(`/groups/${group.id}/ranking` as any);
  };

  // Handler for navigating to members
  const handleViewMembers = () => {
    router.push(`/groups/${group.id}/members` as any);
  };

  // Handler for navigating to invite
  const handleViewInvite = () => {
    router.push(`/groups/${group.id}/invite` as any);
  };

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        {/* Predictions / Games Section - tap opens games page */}
        <GroupLobbyFixturesSection
          fixtures={fixtures}
          groupId={group.id}
          bannerTitle="Predictions"
          onBannerPress={handleViewGames}
          predictionsCount={predictionsCount}
          totalFixtures={totalFixtures}
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
            {leader && (
              <AppText variant="caption" color="secondary" style={styles.leaderText}>
                Leader: {leader.username ?? `Player #${leader.rank}`}
              </AppText>
            )}
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

        {/* Invite Section - show only if inviteAccess is "all" or user is creator (owner) */}
        {(group.inviteAccess !== "admin_only" || isCreator) && (
          <Card style={styles.bannerCard}>
            <Pressable
              onPress={handleViewInvite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText variant="body" style={styles.bannerText}>
                Invite
              </AppText>
            </Pressable>
          </Card>
        )}

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
  leaderText: {
    marginTop: 4,
  },
  predictionsOverviewCard: {
    marginBottom: 16,
  },
  predictionsOverviewText: {
    fontWeight: "600",
  },
});
