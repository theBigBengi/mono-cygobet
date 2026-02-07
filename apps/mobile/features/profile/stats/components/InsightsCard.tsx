// features/profile/stats/components/InsightsCard.tsx
// Dynamic insights based on user performance.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { ApiInsight } from "@repo/types";

interface InsightsCardProps {
  insights: ApiInsight[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  const { t, i18n } = useTranslation("common");
  const { theme } = useTheme();
  const isHebrew = i18n.language === "he";

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        {t("profile.insights")}
      </AppText>
      <View style={styles.list}>
        {insights.map((insight, index) => (
          <View
            key={index}
            style={[
              styles.insightRow,
              index < insights.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <AppText style={styles.icon}>{insight.icon}</AppText>
            <AppText variant="body" style={styles.text}>
              {isHebrew ? insight.textHe : insight.text}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  list: {},
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  text: {
    flex: 1,
  },
});
