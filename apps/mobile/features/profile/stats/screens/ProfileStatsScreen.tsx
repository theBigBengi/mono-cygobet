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
import {
  useGamificationQuery,
  PowerScoreCard,
  RankTierBadge,
  SkillRadarChart,
  StreakIndicator,
  SeasonComparisonCard,
} from "../../gamification";
import { HeroHeader } from "../components/HeroHeader";
import { PerformanceCard } from "../components/PerformanceCard";
import { BadgesCard } from "../components/BadgesCard";
import { GroupStatsCard } from "../components/GroupStatsCard";
import { EditProfileModal } from "../../components/EditProfileModal";
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
  const gamificationQuery = useGamificationQuery(userId);
  const gamification = gamificationQuery.data?.data;

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

  const displayUsername = isOwnProfile ? currentUsername : data.user.username;
  const displayImage = isOwnProfile ? currentImage : data.user.image;
  const correctPredictions =
    data.distribution.exact +
    data.distribution.difference +
    data.distribution.outcome;

  return (
    <Screen scroll>
      <HeroHeader
        username={displayUsername}
        image={displayImage}
        accuracy={data.overall.accuracy}
        totalPredictions={data.overall.settledPredictions}
        exactPredictions={data.overall.exactScores}
        correctPredictions={correctPredictions}
        showEditButton={isOwnProfile}
        onEditPress={() => setEditModalVisible(true)}
      />
      <PerformanceCard
        form={data.form}
        exact={data.distribution.exact}
        difference={data.distribution.difference}
        outcome={data.distribution.outcome}
        miss={data.distribution.miss}
      />
      <BadgesCard badges={data.badges} />
      {gamification && (
        <>
          <PowerScoreCard score={gamification.powerScore} />
          <RankTierBadge
            tier={gamification.rankTier}
            progress={gamification.rankProgress}
          />
          <SkillRadarChart skills={gamification.skills} />
          <StreakIndicator streak={gamification.streak} />
          <SeasonComparisonCard comparison={gamification.seasonComparison} />
        </>
      )}
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
