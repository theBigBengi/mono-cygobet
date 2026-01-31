// features/profile/stats/components/GroupStatsCard.tsx
// Card wrapping list of GroupStatRow.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Card, AppText, Divider } from "@/components/ui";
import { GroupStatRow } from "./GroupStatRow";
import { useTheme } from "@/lib/theme";
import type { ApiUserGroupStat } from "@repo/types";

interface GroupStatsCardProps {
  groups: ApiUserGroupStat[];
}

export function GroupStatsCard({ groups }: GroupStatsCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  if (groups.length === 0) {
    return (
      <Card>
        <AppText variant="subtitle" style={styles.title}>
          {t("predictions.groups")}
        </AppText>
        <AppText variant="body" color="secondary">
          {t("groups.noGroupsYet")}
        </AppText>
      </Card>
    );
  }

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
          {t("predictions.groups")}
        </AppText>
      {groups.map((group, i) => (
        <View key={group.groupId}>
          {i > 0 && <Divider style={{ marginVertical: theme.spacing.sm }} />}
          <GroupStatRow
            groupName={group.groupName}
            rank={group.rank}
            totalPoints={group.totalPoints}
            accuracy={group.accuracy}
            recentPoints={group.recentPoints}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
});
