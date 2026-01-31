// features/groups/ranking/screens/GroupMemberProfileScreen.tsx
// Screen component for group member profile (group-scoped stats from nav params).

import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, AppText, Row, Stack, Divider, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";

export interface GroupMemberProfileScreenProps {
  groupId: number | null;
  userId: number | null;
  username: string;
  rank: number | null;
  totalPoints: number | null;
  correctScoreCount: number | null;
  predictionCount: number | null;
}

/**
 * GroupMemberProfileScreen component
 *
 * Displays a member's group-scoped stats passed via navigation params.
 * Highlights when viewing the current user's profile.
 */
export function GroupMemberProfileScreen({
  groupId,
  userId,
  username,
  rank,
  totalPoints,
  correctScoreCount,
  predictionCount,
}: GroupMemberProfileScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isOwnProfile =
    userId != null && user?.id != null && userId === user.id;

  const hasValidIds = groupId != null && userId != null;
  const hasValidStats =
    rank != null &&
    totalPoints != null &&
    correctScoreCount != null &&
    predictionCount != null;

  if (!hasValidIds) {
    return (
      <Screen>
        <View style={[styles.centered, { padding: theme.spacing.lg }]}>
          <AppText variant="body" color="secondary">
            {t("profile.invalidMemberData")}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (!hasValidStats) {
    return (
      <Screen>
        <View style={[styles.centered, { padding: theme.spacing.lg }]}>
          <AppText variant="body" color="secondary">
            {t("profile.missingRankingData")}
          </AppText>
        </View>
      </Screen>
    );
  }

  const displayName = username.trim() || "—";
  const titleLine = `${displayName}${isOwnProfile ? ` (${t("profile.you")})` : ""}`;

  return (
    <Screen>
      <View style={[styles.content, { padding: theme.spacing.md }]}>
        <Card
          style={[
            styles.card,
            {
              borderWidth: isOwnProfile ? 2 : 1,
              borderColor: isOwnProfile
                ? theme.colors.primary
                : theme.colors.border,
              paddingVertical: theme.spacing.lg,
            },
          ]}
        >
          <Stack gap={theme.spacing.lg}>
            <View style={styles.header}>
              <AppText variant="title" style={styles.headerTitle}>
                {titleLine}
              </AppText>
            </View>
            <Divider />
            <StatRow label={t("profile.rank")} value={String(rank)} />
            <StatRow label={t("profile.totalPoints")} value={String(totalPoints)} />
            <StatRow
              label={t("predictions.exactScoresLabel")}
              value={String(correctScoreCount)}
            />
            <StatRow
              label={t("predictions.predictionsLabel")}
              value={String(predictionCount)}
            />
            {!isOwnProfile && userId != null && (
              <>
                <Divider />
                <Button
                  label={t("predictions.compare")}
                  variant="primary"
                  onPress={() =>
                    router.push(
                      `/profile/head-to-head?opponentId=${userId}` as any
                    )
                  }
                />
              </>
            )}
          </Stack>
        </Card>
      </View>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <Row
      gap={theme.spacing.md}
      style={{ justifyContent: "space-between", alignItems: "center" }}
    >
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <AppText variant="body" style={{ fontWeight: "600" }}>
        {value}
      </AppText>
    </Row>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    minHeight: 120,
  },
  header: {
    alignItems: "center",
  },
  headerTitle: {
    textAlign: "center",
  },
});
