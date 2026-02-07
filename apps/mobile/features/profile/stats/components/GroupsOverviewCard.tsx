// features/profile/stats/components/GroupsOverviewCard.tsx
// 3-column grid: Groups played, Active, Won.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface GroupsOverviewCardProps {
  groupsPlayed: number;
  groupsActive: number;
  groupsWon: number;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.box, { padding: theme.spacing.md }]}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="title" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export function GroupsOverviewCard({
  groupsPlayed,
  groupsActive,
  groupsWon,
}: GroupsOverviewCardProps) {
  const { t } = useTranslation("common");
  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        {t("predictions.groups")}
      </AppText>
      <View style={styles.grid}>
        <StatBox label={t("profile.groupsPlayed")} value={groupsPlayed} />
        <StatBox label={t("profile.groupsActive")} value={groupsActive} />
        <StatBox label={t("profile.groupsWon")} value={groupsWon} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  box: {
    width: "33.33%",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    marginTop: 4,
  },
});
