// features/group-creation/screens/CreateGroupModalLeaguesView.tsx
// Game-like view for displaying selected leagues in create group modal.

import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import {
  useSelectedLeagues,
  useToggleLeague,
} from "@/features/group-creation/selection/leagues";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

    return items;
  }, [preview, t]);

  if (leagues.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText variant="body" color="secondary">
          {t("fixtures.noLeagueSelected")}
        </AppText>
      </View>
    );
  }

  const handleRemove = (league: typeof leagues[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLeague(league);
  };

  return (
    <>
      <SelectionSummaryCard
        items={summaryItems}
        loading={previewLoading}
        skeletonCount={2}
      />
      {leagues.map((l) => (
        <View
          key={l.id}
          style={[
            styles.listCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderBottomColor: theme.colors.textSecondary + "40",
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.logoContainer}>
              <TeamLogo
                imagePath={l.imagePath}
                teamName={l.name}
                size={32}
              />
            </View>
            <AppText variant="body" style={styles.name}>
              {l.name}
            </AppText>
            <Pressable
              onPress={() => handleRemove(l)}
              style={({ pressed }) => [
                styles.removeBtn,
                {
                  backgroundColor: theme.colors.danger + "15",
                  borderColor: theme.colors.danger + "40",
                  borderBottomColor: pressed
                    ? theme.colors.danger + "40"
                    : theme.colors.danger + "60",
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <Ionicons
                name="close"
                size={18}
                color={theme.colors.danger}
              />
            </Pressable>
          </View>
        </View>
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
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  name: {
    flex: 1,
    fontWeight: "600",
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    shadowOpacity: 0.1,
    elevation: 2,
  },
});
