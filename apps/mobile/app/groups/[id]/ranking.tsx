// app/groups/[id]/ranking.tsx
// Route wrapper for group ranking screen.

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWithHeader } from "@/components/ui";
import { GroupRankingScreen } from "@/features/groups/ranking";
import { useGroupQuery, useGroupRankingQuery } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";
import { shareText, buildRankingShareText } from "@/utils/sharing";

function RankingShareButton({ groupId }: { groupId: number | null }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: groupData } = useGroupQuery(groupId);
  const { data: rankingData } = useGroupRankingQuery(groupId);

  if (!groupId || !user || !groupData?.data || !rankingData?.data) return null;
  const groupName = groupData.data.name;
  const myRow = rankingData.data.find((item) => item.userId === user.id);
  if (!myRow) return null;

  const onPress = () => {
    shareText(
      buildRankingShareText({
        username: myRow.username ?? "Me",
        rank: myRow.rank,
        totalPoints: myRow.totalPoints,
        groupName,
      })
    );
  };

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Ionicons
        name="share-outline"
        size={22}
        color={theme.colors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    marginRight: 4,
  },
});

export default function GroupRankingRoute() {
  return (
    <ErrorBoundary feature="group-ranking">
      <RankingContent />
    </ErrorBoundary>
  );
}

function RankingContent() {
  const params = useLocalSearchParams<{ id: string }>();
  const groupId =
    params.id && !isNaN(Number(params.id)) ? Number(params.id) : null;

  const { t } = useTranslation("common");
  return (
    <ScreenWithHeader
      title={t("groups.ranking")}
      rightContent={<RankingShareButton groupId={groupId} />}
    >
      <GroupRankingScreen groupId={groupId} />
    </ScreenWithHeader>
  );
}
