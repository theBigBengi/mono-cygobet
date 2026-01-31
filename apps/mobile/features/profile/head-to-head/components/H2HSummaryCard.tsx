// features/profile/head-to-head/components/H2HSummaryCard.tsx
// W/L/T record + overall comparison.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText, Divider } from "@/components/ui";
import { ComparisonBar } from "./ComparisonBar";
import { useTheme } from "@/lib/theme";

interface H2HSummaryCardProps {
  userLabel: string;
  opponentLabel: string;
  userWins: number;
  opponentWins: number;
  ties: number;
  userTotalPoints: number;
  opponentTotalPoints: number;
  userExactScores: number;
  opponentExactScores: number;
  userAccuracy: number;
  opponentAccuracy: number;
}

export function H2HSummaryCard({
  userLabel,
  opponentLabel,
  userWins,
  opponentWins,
  ties,
  userTotalPoints,
  opponentTotalPoints,
  userExactScores,
  opponentExactScores,
  userAccuracy,
  opponentAccuracy,
}: H2HSummaryCardProps) {
  const { theme } = useTheme();
  const record = `${userWins}-${ties}-${opponentWins}`;

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Head to Head
      </AppText>
      <View style={[styles.record, { marginBottom: theme.spacing.md }]}>
        <AppText variant="body" color="secondary">
          Record (W-T-L)
        </AppText>
        <AppText variant="title">{record}</AppText>
      </View>
      <Divider />
      <ComparisonBar
        label="Points"
        userValue={userTotalPoints}
        opponentValue={opponentTotalPoints}
        userLabel={userLabel}
        opponentLabel={opponentLabel}
      />
      <Divider />
      <ComparisonBar
        label="Exact"
        userValue={userExactScores}
        opponentValue={opponentExactScores}
      />
      <Divider />
      <ComparisonBar
        label="Accuracy"
        userValue={`${userAccuracy}%`}
        opponentValue={`${opponentAccuracy}%`}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
  },
  record: {
    alignItems: "center",
  },
});
