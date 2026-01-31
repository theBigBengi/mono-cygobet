// features/profile/stats/components/PredictionDistributionCard.tsx
// Horizontal stacked bar (4 colors) + legend.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface PredictionDistributionCardProps {
  exact: number;
  difference: number;
  outcome: number;
  miss: number;
}

const COLORS = {
  exact: "#34C759",
  difference: "#007AFF",
  outcome: "#FFCC00",
  miss: "#FF3B30",
};

export function PredictionDistributionCard({
  exact,
  difference,
  outcome,
  miss,
}: PredictionDistributionCardProps) {
  const { theme } = useTheme();
  const total = exact + difference + outcome + miss;

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Prediction Breakdown
      </AppText>
      <View style={[styles.barContainer, { height: 12, borderRadius: 6 }]}>
        {total > 0 ? (
          <View style={styles.barRow}>
            {exact > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: exact, backgroundColor: COLORS.exact },
                ]}
              />
            )}
            {difference > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: difference, backgroundColor: COLORS.difference },
                ]}
              />
            )}
            {outcome > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: outcome, backgroundColor: COLORS.outcome },
                ]}
              />
            )}
            {miss > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: miss, backgroundColor: COLORS.miss },
                ]}
              />
            )}
          </View>
        ) : (
          <View style={[styles.segment, { flex: 1, backgroundColor: "#E5E5E5" }]} />
        )}
      </View>
      <View style={[styles.legend, { marginTop: theme.spacing.md }]}>
        <LegendItem color={COLORS.exact} label="Exact" value={exact} />
        <LegendItem color={COLORS.difference} label="Diff" value={difference} />
        <LegendItem color={COLORS.outcome} label="Outcome" value={outcome} />
        <LegendItem color={COLORS.miss} label="Miss" value={miss} />
      </View>
    </Card>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color="secondary">
        {label}: {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  barContainer: {
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#E5E5E5",
  },
  barRow: {
    flexDirection: "row",
    flex: 1,
  },
  segment: {
    minWidth: 0,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
