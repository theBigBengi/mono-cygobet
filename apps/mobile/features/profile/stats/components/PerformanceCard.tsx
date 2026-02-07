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

const COLORS = {
  exact: "#34C759",
  difference: "#007AFF",
  outcome: "#FFCC00",
  miss: "#FF3B30",
};

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

  const formDisplay: ApiFormItem[] = [...form];
  while (formDisplay.length < 10) {
    formDisplay.push({ fixtureId: 0, points: 0, result: "miss" });
  }

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        {t("profile.performance")}
      </AppText>

      <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
        {t("profile.lastPredictions", { count: 10 })}
      </AppText>
      <View style={styles.formRow}>
        {formDisplay.slice(0, 10).map((item, i) => (
          <View
            key={i}
            style={[
              styles.formDot,
              {
                backgroundColor:
                  item.fixtureId === 0
                    ? theme.colors.border
                    : (COLORS[item.result] ?? COLORS.miss),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.barContainer}>
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

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.exact }]} />
          <AppText variant="caption" color="secondary">
            {t("predictions.exact")}: {exact}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.difference }]}
          />
          <AppText variant="caption" color="secondary">
            {t("predictions.diff")}: {difference}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.outcome }]}
          />
          <AppText variant="caption" color="secondary">
            {t("predictions.outcome")}: {outcome}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.miss }]} />
          <AppText variant="caption" color="secondary">
            {t("predictions.miss")}: {miss}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  formRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  formDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E5E5",
    marginBottom: 12,
  },
  barRow: {
    flexDirection: "row",
    flex: 1,
  },
  segment: {},
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
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
