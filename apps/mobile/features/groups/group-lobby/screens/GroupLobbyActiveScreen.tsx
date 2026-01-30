// features/groups/group-lobby/screens/GroupLobbyActiveScreen.tsx
// Active state screen for group lobby.
// Shows fixtures and meta information.
// Group name is displayed in the header instead.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
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

  // Derive fixtures from group.fixtures
  const fixtures =
    Array.isArray((group as any).fixtures) ? ((group as any).fixtures as FixtureItem[]) : [];

  // Handler for navigating to view all games
  const handleViewAllGames = () => {
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

  return (
    <View style={styles.container}>
      <Screen
        contentContainerStyle={styles.screenContent}
        onRefresh={onRefresh}
        scroll
      >
        {/* Selected Games Section */}
        <GroupLobbyFixturesSection
          onViewAll={handleViewAllGames}
          fixtures={fixtures}
          groupId={group.id}
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
  predictionsOverviewCard: {
    marginBottom: 16,
  },
  predictionsOverviewText: {
    fontWeight: "600",
  },
});
