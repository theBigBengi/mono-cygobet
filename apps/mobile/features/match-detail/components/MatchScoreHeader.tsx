// features/match-detail/components/MatchScoreHeader.tsx
// Team logos, names, score or "vs", state badge, live minute.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useEntityTranslation } from "@/lib/i18n/i18n.entities";
import { isNotStarted, isLive, isFinished } from "@repo/utils";
import type { ApiFixtureDetailData } from "@repo/types";

interface MatchScoreHeaderProps {
  data: ApiFixtureDetailData;
}

function getStateBadgeColor(
  state: string,
  theme: { colors: Record<string, string> }
): string {
  if (isLive(state)) {
    return theme.colors.danger ?? "#dc2626";
  }
  if (isFinished(state)) {
    return theme.colors.success ?? "#16a34a";
  }
  return theme.colors.border ?? "#d1d5db";
}

export function MatchScoreHeader({ data }: MatchScoreHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { translateTeam } = useEntityTranslation();

  const homeName = translateTeam(data.homeTeam.name, t("common.home"));
  const awayName = translateTeam(data.awayTeam.name, t("common.away"));
  const gameNotStarted = isNotStarted(data.state);
  const scoreDisplay = gameNotStarted
    ? "vs"
    : `${data.homeScore90 ?? "—"} - ${data.awayScore90 ?? "—"}`;
  const stateBadgeColor = getStateBadgeColor(data.state, theme);
  const showLiveMinute =
    data.liveMinute != null && isLive(data.state);

  return (
    <View style={styles.container}>
      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <TeamLogo
            imagePath={data.homeTeam.imagePath}
            teamName={homeName}
            size={40}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={2}>
            {homeName}
          </AppText>
        </View>

        <View style={styles.scoreBlock}>
          <AppText variant="title" style={styles.score}>
            {scoreDisplay}
          </AppText>
          <View style={styles.badges}>
            <View
              style={[styles.stateBadge, { backgroundColor: stateBadgeColor }]}
            >
              <AppText variant="caption" style={[styles.stateText, { color: theme.colors.textInverse }]}>
                {data.state}
              </AppText>
            </View>
            {showLiveMinute && (
              <View
                style={[
                  styles.liveMinuteBadge,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <AppText variant="caption" color="secondary">
                  {t("matchDetail.liveMinute", { minute: data.liveMinute })}
                </AppText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.teamBlock}>
          <TeamLogo
            imagePath={data.awayTeam.imagePath}
            teamName={awayName}
            size={40}
          />
          <AppText variant="body" style={styles.teamName} numberOfLines={2}>
            {awayName}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamBlock: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  teamName: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13,
  },
  scoreBlock: {
    flexShrink: 0,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  score: {
    fontSize: 24,
    fontWeight: "700",
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stateText: {
    fontWeight: "600",
    fontSize: 11,
  },
  liveMinuteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
