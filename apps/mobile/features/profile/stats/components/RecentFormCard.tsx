// features/profile/stats/components/RecentFormCard.tsx
// Row of 10 colored circles (green/blue/yellow/red by result).

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiFormItem } from "@repo/types";

interface RecentFormCardProps {
  form: ApiFormItem[];
}

const RESULT_COLORS: Record<string, string> = {
  exact: "#34C759",
  difference: "#007AFF",
  outcome: "#FFCC00",
  miss: "#FF3B30",
};

export function RecentFormCard({ form }: RecentFormCardProps) {
  const { theme } = useTheme();
  const padded = [...form];
  while (padded.length < 10) {
    padded.push({
      fixtureId: 0,
      points: 0,
      result: "miss" as const,
    });
  }
  const display = padded.slice(0, 10);

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Recent Form
      </AppText>
      <View style={[styles.row, { gap: theme.spacing.xs }]}>
        {display.map((item, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: RESULT_COLORS[item.result] ?? "#999",
                width: 20,
                height: 20,
                borderRadius: 10,
              },
            ]}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  dot: {},
});
