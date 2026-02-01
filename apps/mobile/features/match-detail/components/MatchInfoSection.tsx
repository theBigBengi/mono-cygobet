// features/match-detail/components/MatchInfoSection.tsx
// Kickoff time, league + country, round, stage.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { formatKickoffTime } from "@/utils/fixture";
import type { ApiFixtureDetailData } from "@repo/types";

interface MatchInfoSectionProps {
  data: ApiFixtureDetailData;
}

export function MatchInfoSection({ data }: MatchInfoSectionProps) {
  const { t } = useTranslation("common");
  const kickoffFormatted = formatKickoffTime(data.kickoffAt);
  const league = data.league;
  const country = data.country;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <AppText variant="caption" color="secondary">
          {t("matchDetail.kickoff")}
        </AppText>
        <AppText variant="body">{kickoffFormatted}</AppText>
      </View>
      {league != null && (
        <View style={styles.row}>
          <AppText variant="caption" color="secondary">
            {t("matchDetail.league")}
          </AppText>
          <View style={styles.leagueRow}>
            <TeamLogo
              imagePath={league.imagePath}
              teamName={league.name}
              size={20}
            />
            <AppText variant="body" style={styles.leagueName}>
              {league.name}
              {country != null ? ` · ${country.name}` : ""}
            </AppText>
          </View>
        </View>
      )}
      {data.round != null && (
        <View style={styles.row}>
          <AppText variant="caption" color="secondary">
            {t("matchDetail.round", { round: data.round })}
          </AppText>
        </View>
      )}
      {data.stage != null && (
        <View style={styles.row}>
          <AppText variant="caption" color="secondary">
            {t("matchDetail.stage", { stage: data.stage })}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  leagueName: {
    flex: 1,
  },
});
