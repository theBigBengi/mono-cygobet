// features/profile/stats/screens/ProfileStatsScreen.tsx
// Main stats screen: ScrollView with all cards.

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, Button } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useUserStatsQuery, useProfileQuery } from "../../profile.queries";
import { ProfileHeader } from "../components/ProfileHeader";
import { EditProfileModal } from "../../components/EditProfileModal";
import { PredictionsStatsCard } from "../components/PredictionsStatsCard";
import { PredictionDistributionCard } from "../components/PredictionDistributionCard";
import { RecentFormCard } from "../components/RecentFormCard";
import { BadgesCard } from "../components/BadgesCard";
import { GroupStatsCard } from "../components/GroupStatsCard";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";

interface ProfileStatsScreenProps {
  userId: number;
}

export function ProfileStatsScreen({ userId }: ProfileStatsScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const isOwnProfile = user?.id === userId;
  const [editModalVisible, setEditModalVisible] = useState(false);

  const statsQuery = useUserStatsQuery(userId);
  const profileQuery = useProfileQuery();

  if (statsQuery.isLoading) {
    return (
      <Screen>
        <QueryLoadingView message={t("profile.loadingStats")} />
      </Screen>
    );
  }

  if (statsQuery.isError) {
    return (
      <Screen>
        <QueryErrorView
          message={t("profile.failedLoadStats")}
          onRetry={() => void statsQuery.refetch()}
        />
      </Screen>
    );
  }

  const data = statsQuery.data?.data;
  if (!data) {
    return (
      <Screen>
        <QueryErrorView message={t("profile.noStatsData")} />
      </Screen>
    );
  }

  const level = isOwnProfile ? (profileQuery.data?.profile?.level ?? 1) : 1;
  const dailyStreak = isOwnProfile
    ? (profileQuery.data?.profile?.dailyStreak ?? 0)
    : 0;

  const correctPredictions =
    data.distribution.exact +
    data.distribution.difference +
    data.distribution.outcome;
  const groupsActive = data.groups.filter(
    (g) => g.groupStatus === "active"
  ).length;
  const groupsWon = data.groups.filter(
    (g) => g.rank === 1 && g.groupStatus === "ended"
  ).length;

  const profileUser = profileQuery.data?.user;
  const currentUsername = profileUser?.username ?? data.user.username;
  const currentName = profileUser?.name ?? null;
  const currentImage = profileUser?.image ?? data.user.image;

  return (
    <Screen scroll>
      <ProfileHeader
        username={data.user.username}
        image={data.user.image}
        level={level}
        dailyStreak={dailyStreak}
        showEditButton={isOwnProfile}
        onEditPress={isOwnProfile ? () => setEditModalVisible(true) : undefined}
      />
      <PredictionsStatsCard
        accuracy={data.overall.accuracy}
        correctPredictions={correctPredictions}
        exactScores={data.overall.exactScores}
      />
      <PredictionDistributionCard
        exact={data.distribution.exact}
        difference={data.distribution.difference}
        outcome={data.distribution.outcome}
        miss={data.distribution.miss}
      />
      <RecentFormCard form={data.form} />
      <BadgesCard badges={data.badges} />
      <GroupStatsCard
        groups={data.groups}
        groupsPlayed={data.overall.groupsPlayed}
        groupsActive={groupsActive}
        groupsWon={groupsWon}
      />
      {isOwnProfile && (
        <View style={[styles.compareButton, { marginTop: theme.spacing.md }]}>
          <Button
            label={t("profile.compareWithOthers")}
            variant="primary"
            onPress={() => router.push("/profile/head-to-head" as any)}
            style={styles.compareButtonInner}
          />
        </View>
      )}
      {isOwnProfile && (
        <EditProfileModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          currentUsername={currentUsername}
          currentName={currentName}
          currentImage={currentImage}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  compareButton: {
    width: "100%",
  },
  compareButtonInner: {
    width: "100%",
  },
});
