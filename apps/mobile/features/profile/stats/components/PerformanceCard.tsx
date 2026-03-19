// features/profile/stats/components/PerformanceCard.tsx
// Combined card: recent form dots + distribution bar + legend.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { ApiFormItem } from "@repo/types";

interface PerformanceCardProps {
  form: ApiFormItem[];
  exact: number;
  difference: number;
  outcome: number;
  miss: number;
}

export function PerformanceCard({
  form,
  exact,
  difference,
  outcome,
  miss,
}: PerformanceCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const total = exact + difference + outcome + miss;

  const COLORS = {
    exact: theme.colors.success,
    difference: theme.colors.warning,
    outcome: theme.colors.accent,
    miss: theme.colors.danger,
  };

  const formDisplay: ApiFormItem[] = [...form];
  while (formDisplay.length < 10) {
    formDisplay.push({ fixtureId: 0, points: 0, result: "miss" });
  }

  return (
    <Card>
      <AppText variant="subtitle" style={[styles.title, { marginBottom: theme.spacing.md }]}>
        {t("profile.performance")}
      </AppText>

      <AppText variant="caption" color="secondary" style={[styles.sectionLabel, { marginBottom: theme.spacing.sm }]}>
        {t("profile.lastPredictions", { count: 10 })}
      </AppText>
      <View style={[styles.formRow, { marginBottom: theme.spacing.ml }]}>
        {formDisplay.slice(0, 10).map((item, i) => (
          <View
            key={i}
            style={[
              styles.formDot,
              {
                borderRadius: theme.radius.md,
                backgroundColor:
                  item.fixtureId === 0
                    ? theme.colors.border
                    : (COLORS[item.result] ?? COLORS.miss),
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.barContainer, { backgroundColor: theme.colors.border, borderRadius: theme.radius.xs, marginBottom: theme.spacing.ms }]}>
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
          <View
            style={[
              styles.segment,
              { flex: 1, backgroundColor: theme.colors.border },
            ]}
          />
        )}
      </View>

      <View style={[styles.legend, { rowGap: theme.spacing.sm }]}>
        <View style={[styles.legendItem, { gap: theme.spacing.xs }]}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.exact, borderRadius: theme.radius.full }]} />
          <AppText variant="caption" color="secondary">
            {t("predictions.exact")}: {exact}
          </AppText>
        </View>
        <View style={[styles.legendItem, { gap: theme.spacing.xs }]}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.difference, borderRadius: theme.radius.full }]}
          />
          <AppText variant="caption" color="secondary">
            {t("predictions.diff")}: {difference}
          </AppText>
        </View>
        <View style={[styles.legendItem, { gap: theme.spacing.xs }]}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.outcome, borderRadius: theme.radius.full }]}
          />
          <AppText variant="caption" color="secondary">
            {t("predictions.outcome")}: {outcome}
          </AppText>
        </View>
        <View style={[styles.legendItem, { gap: theme.spacing.xs }]}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.miss, borderRadius: theme.radius.full }]} />
          <AppText variant="caption" color="secondary">
            {t("predictions.miss")}: {miss}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {},
  sectionLabel: {},
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formDot: {
    width: 28,
    height: 28,
  },
  barContainer: {
    height: 12,
    overflow: "hidden",
    // backgroundColor set via inline style (theme.colors.border)
  },
  barRow: {
    flexDirection: "row",
    flex: 1,
  },
  segment: {},
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
  },
  legendDot: {
    width: 8,
    height: 8,
  },
});
