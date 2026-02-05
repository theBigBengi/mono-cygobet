// features/group-creation/screens/CreateGroupModalTeamsView.tsx
// View for displaying selected teams in create group modal.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedTeams,
  useToggleTeam,
} from "@/features/group-creation/selection/teams";
import { MaterialIcons } from "@expo/vector-icons";
import { SelectionSummaryCard } from "@/features/group-creation/components/SelectionSummaryCard";
import { useGroupPreviewQuery } from "@/domains/groups";
import { formatMonthDay } from "@/utils/fixture";

export function CreateGroupModalTeamsView() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const teams = useSelectedTeams();
  const toggleTeam = useToggleTeam();

  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);
  const { data: preview, isLoading: previewLoading } = useGroupPreviewQuery({
    selectionMode: "teams",
    teamIds,
  });

  const summaryItems = useMemo(() => {
    const items: { icon: string; label: string; value: string }[] = [];

    if (preview?.data?.startDate && preview?.data?.endDate) {
      const startStr = formatMonthDay(preview.data.startDate);
      const endStr = formatMonthDay(preview.data.endDate);
      const dateRangeValue =
        preview.data.startDate === preview.data.endDate
          ? startStr
          : `${startStr} - ${endStr}`;
      items.push({
        icon: "event",
        label: t("fixtures.selectionSummaryDateRange"),
        value: dateRangeValue,
      });
    }

    if (preview?.data?.fixtureCount != null) {
      items.push({
        icon: "sports-soccer",
        label: t("fixtures.selectionSummaryGames"),
        value: t("fixtures.selectionSummaryGamesCount", {
          count: preview.data.fixtureCount,
        }),
      });
    }

    if (preview?.data?.leagueCount != null) {
      items.push({
        icon: "emoji-events",
        label: t("fixtures.selectionSummaryLeagues"),
        value: t("fixtures.selectionSummaryLeaguesCount", {
          count: preview.data.leagueCount,
        }),
      });
    }

    return items;
  }, [preview, t]);

  if (teams.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noTeamsSelected")}
        </AppText>
      </View>
    );
  }

  return (
    <>
      <SelectionSummaryCard items={summaryItems} loading={previewLoading} />
      {teams.map((team) => (
        <Card
          key={team.id}
          style={[
            styles.listCard,
            { backgroundColor: theme.colors.cardBackground },
          ]}
        >
          <View style={styles.row}>
            <TeamLogo
              imagePath={team.imagePath}
              teamName={team.name}
              size={28}
              style={styles.logo}
            />
            <View style={styles.flex1}>
              <AppText variant="body">{team.name}</AppText>
              {team.country?.name ? (
                <AppText variant="caption" color="secondary">
                  {team.country.name}
                </AppText>
              ) : null}
            </View>
            <Pressable
              onPress={() => toggleTeam(team)}
              style={({ pressed }) => [
                styles.removeBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.danger}
              />
            </Pressable>
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  listCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    marginRight: 10,
  },
  flex1: {
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
});
