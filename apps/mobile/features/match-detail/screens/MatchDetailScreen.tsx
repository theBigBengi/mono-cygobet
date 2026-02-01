// features/match-detail/screens/MatchDetailScreen.tsx
// Match detail screen: header, info, period scores, my predictions.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView } from "react-native";
import { ScreenWithHeader } from "@/components/ui/ScreenWithHeader";
import { AppText, Card } from "@/components/ui";
import type { ApiFixtureDetailData } from "@repo/types";
import {
  MatchScoreHeader,
  MatchInfoSection,
  PeriodScoresSection,
  PredictionCard,
} from "../components";

interface MatchDetailScreenProps {
  data: ApiFixtureDetailData;
}

const SHOW_PERIOD_SCORES_STATES = new Set(["AET", "FT_PEN"]);

export function MatchDetailScreen({ data }: MatchDetailScreenProps) {
  const { t } = useTranslation("common");
  const showPeriodScores = SHOW_PERIOD_SCORES_STATES.has(data.state);

  return (
    <ScreenWithHeader
      title={data.name}
      fallbackRoute="/(tabs)/groups"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <MatchScoreHeader data={data} />
        </Card>

        <MatchInfoSection data={data} />

        {showPeriodScores && (
          <View style={styles.section}>
            <AppText variant="subtitle" style={styles.sectionTitle}>
              {t("matchDetail.periodScores")}
            </AppText>
            <PeriodScoresSection
              homeScore90={data.homeScore90}
              awayScore90={data.awayScore90}
              homeScoreET={data.homeScoreET}
              awayScoreET={data.awayScoreET}
              penHome={data.penHome}
              penAway={data.penAway}
            />
          </View>
        )}

        <View style={styles.section}>
          <AppText variant="subtitle" style={styles.sectionTitle}>
            {t("matchDetail.myPredictions")}
          </AppText>
          {data.predictions.length === 0 ? (
            <AppText variant="body" color="secondary">
              {t("matchDetail.noPredictions")}
            </AppText>
          ) : (
            data.predictions.map((pred) => (
              <PredictionCard
                key={pred.groupId}
                prediction={pred}
                result={data.result}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenWithHeader>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
});
