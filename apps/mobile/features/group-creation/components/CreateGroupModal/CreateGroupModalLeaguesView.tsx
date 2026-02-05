// features/group-creation/screens/CreateGroupModalLeaguesView.tsx
// View for displaying selected leagues in create group modal.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Card, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedLeagues,
  useToggleLeague,
} from "@/features/group-creation/selection/leagues";
import { MaterialIcons } from "@expo/vector-icons";
import { SelectionSummaryCard } from "@/features/group-creation/components/SelectionSummaryCard";
import { useGroupPreviewQuery } from "@/domains/groups";
import { formatMonthDay } from "@/utils/fixture";

export function CreateGroupModalLeaguesView() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const leagues = useSelectedLeagues();
  const toggleLeague = useToggleLeague();

  const leagueIds = useMemo(() => leagues.map((l) => l.id), [leagues]);
  const { data: preview, isLoading: previewLoading } = useGroupPreviewQuery({
    selectionMode: "leagues",
    leagueIds,
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

    items.push({
      icon: "emoji-events",
      label: t("fixtures.selectionSummaryLeagues"),
      value: t("fixtures.selectionSummaryLeaguesCount", {
        count: leagues.length,
      }),
    });

    return items;
  }, [preview, leagues, t]);

  if (leagues.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noLeagueSelected")}
        </AppText>
      </View>
    );
  }

  return (
    <>
      <SelectionSummaryCard items={summaryItems} loading={previewLoading} />
      {leagues.map((l) => (
        <Card key={l.id} style={styles.listCard}>
          <View style={styles.row}>
            <TeamLogo
              imagePath={l.imagePath}
              teamName={l.name}
              size={28}
              style={styles.logo}
            />
            <AppText variant="body" style={styles.flex1}>
              {l.name}
            </AppText>
            <Pressable
              onPress={() => toggleLeague(l)}
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
