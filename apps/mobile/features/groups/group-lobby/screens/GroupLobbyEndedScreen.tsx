// features/groups/group-lobby/screens/GroupLobbyEndedScreen.tsx
// Ended state screen for group lobby.
// Shows group ended banner, ranking, fixtures with final scores, and predictions overview.
// Read-only; no invite section or prediction editing.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText } from "@/components/ui";
import type { ApiGroupItem } from "@repo/types";
import {
  GroupLobbyFixturesSection,
  type FixtureItem,
} from "../index";

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
  const router = useRouter();

  const fixtures =
    Array.isArray((group as any).fixtures)
      ? ((group as any).fixtures as FixtureItem[])
      : [];

  const handleViewAllGames = () => {
    router.push(`/groups/${group.id}/games` as any);
  };

  const handleViewPredictionsOverview = () => {
    router.push(`/groups/${group.id}/predictions-overview` as any);
  };

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
        {/* Group Ended Banner */}
        <Card style={styles.bannerCard}>
          <AppText variant="body" style={styles.bannerText}>
            Group Ended
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
