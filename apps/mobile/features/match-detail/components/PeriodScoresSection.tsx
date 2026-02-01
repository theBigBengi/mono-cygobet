// features/match-detail/components/PeriodScoresSection.tsx
// Row: 90' | ET | PEN with score pairs.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";

interface PeriodScoresSectionProps {
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
}

function ScoreCell({
  label,
  home,
  away,
}: {
  label: string;
  home: number | null;
  away: number | null;
}) {
  const hasValue = home != null && away != null;
  const text = hasValue ? `${home} - ${away}` : "—";
  return (
    <View style={styles.cell}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="body">{text}</AppText>
    </View>
  );
}

export function PeriodScoresSection({
  homeScore90,
  awayScore90,
  homeScoreET,
  awayScoreET,
  penHome,
  penAway,
}: PeriodScoresSectionProps) {
  const { t } = useTranslation("common");

  return (
    <View style={styles.container}>
      <ScoreCell
        label={t("matchDetail.min90")}
        home={homeScore90}
        away={awayScore90}
      />
      <ScoreCell
        label={t("matchDetail.extraTime")}
        home={homeScoreET}
        away={awayScoreET}
      />
      <ScoreCell
        label={t("matchDetail.penalties")}
        home={penHome}
        away={penAway}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  cell: {
    alignItems: "center",
    minWidth: 72,
  },
});
