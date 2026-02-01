// features/match-detail/components/PredictionCard.tsx
// Group name, my prediction (formatted), points badge, settled/pending.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import type { ApiFixtureDetailPrediction } from "@repo/types";

interface PredictionCardProps {
  prediction: ApiFixtureDetailPrediction;
  result?: string | null;
}

/**
 * Format prediction string for display.
 * DB format: "2:1" (CorrectScore) or "1:0" / "0:1" / "1:1" (MatchWinner).
 */
function formatPredictionDisplay(
  prediction: string,
  predictionMode: string,
  t: (key: string) => string
): string {
  const parts = prediction.trim().split(":");
  const home = parts[0] ? parseInt(parts[0], 10) : NaN;
  const away = parts[1] ? parseInt(parts[1], 10) : NaN;

  if (predictionMode === "MatchWinner") {
    if (home > away) return t("matchDetail.outcomeHome");
    if (away > home) return t("matchDetail.outcomeAway");
    return t("matchDetail.outcomeDraw");
  }
  if (!Number.isNaN(home) && !Number.isNaN(away)) {
    return `${home}-${away}`;
  }
  return prediction || "—";
}

export function PredictionCard({ prediction, result }: PredictionCardProps) {
  const { t } = useTranslation("common");
  const displayPrediction = formatPredictionDisplay(
    prediction.prediction,
    prediction.predictionMode,
    t
  );
  const pointsText =
    prediction.settled && prediction.points != null
      ? t("matchDetail.points", { points: prediction.points })
      : t("matchDetail.pending");
  const statusKey = prediction.settled ? "matchDetail.settled" : "matchDetail.pending";

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.main}>
          <AppText variant="subtitle" style={styles.groupName}>
            {prediction.groupName}
          </AppText>
          <AppText variant="body" color="secondary">
            {displayPrediction}
            {result != null ? ` · ${result.replace(":", "–")}` : ""}
          </AppText>
        </View>
        <View style={styles.badges}>
          <AppText variant="caption" color="secondary">
            {prediction.settled ? t("matchDetail.settled") : t("matchDetail.pending")}
          </AppText>
          <AppText variant="caption" style={styles.points}>
            {pointsText}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  badges: {
    alignItems: "flex-end",
  },
  points: {
    marginTop: 2,
    fontWeight: "600",
  },
});
