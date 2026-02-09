// features/profile/stats/components/GroupStatsCard.tsx
// Combined card: stats summary + groups list (max 5) + see all.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { GroupCompactCard } from "./GroupCompactCard";
import type { ApiUserGroupStat } from "@repo/types";

const MAX_VISIBLE_GROUPS = 5;

interface GroupStatsCardProps {
  groups: ApiUserGroupStat[];
  groupsPlayed: number;
  groupsActive: number;
  groupsWon: number;
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <AppText variant="title" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

export function GroupStatsCard({
  groups,
  groupsPlayed,
  groupsActive,
  groupsWon,
}: GroupStatsCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();

  // Sort: active first (by points desc), then ended (by points desc)
  const sortedGroups = [...groups].sort((a, b) => {
    const aActive = a.groupStatus === "active";
    const bActive = b.groupStatus === "active";
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.totalPoints - a.totalPoints;
  });

  const visibleGroups = sortedGroups.slice(0, MAX_VISIBLE_GROUPS);
  const remainingCount = groups.length - MAX_VISIBLE_GROUPS;

  const handleSeeAll = () => {
    router.push("/profile/groups");
  };

  const handleGroupPress = (groupId: number) => {
    router.push(`/groups/${groupId}`);
  };

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="subtitle">{t("predictions.groups")}</AppText>
        {groups.length > MAX_VISIBLE_GROUPS && (
          <Pressable onPress={handleSeeAll} hitSlop={10}>
            <AppText variant="body" color="primary" style={styles.seeAll}>
              {t("profile.seeAll")}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
        <StatBox label={t("profile.groupsPlayed")} value={groupsPlayed} />
        <StatBox label={t("profile.groupsActive")} value={groupsActive} />
        <StatBox label={t("profile.groupsWon")} value={groupsWon} />
      </View>

      {/* Groups list */}
      {groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText variant="body" color="secondary" style={styles.empty}>
            {t("profile.noGroupsSubtitle")}
          </AppText>
          <Button
            label={t("profile.browseGroups")}
            variant="secondary"
            onPress={() => router.push("/groups/discover")}
            style={styles.browseButton}
          />
        </View>
      ) : (
        <View style={styles.list}>
          {visibleGroups.map((group) => (
            <GroupCompactCard
              key={group.groupId}
              groupId={group.groupId}
              groupName={group.groupName}
              rank={group.rank}
              totalPoints={group.totalPoints}
              status={group.groupStatus === "active" ? "active" : "ended"}
              onPress={() => handleGroupPress(group.groupId)}
            />
          ))}
        </View>
      )}

      {/* More groups button */}
      {remainingCount > 0 && (
        <Pressable onPress={handleSeeAll} style={styles.moreButton}>
          <AppText variant="body" color="primary">
            {t("profile.moreGroups", { count: remainingCount })}
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAll: {
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    paddingVertical: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  statValue: {
    fontWeight: "700",
    marginBottom: 2,
  },
  list: {},
  emptyContainer: {
    alignItems: "center",
    gap: 12,
  },
  empty: {
    textAlign: "center",
  },
  browseButton: {
    width: "100%",
  },
  moreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
});
