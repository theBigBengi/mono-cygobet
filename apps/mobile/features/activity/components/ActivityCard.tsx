import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiActivityFeedItem } from "@repo/types";

interface ActivityCardProps {
  item: ApiActivityFeedItem;
}

function getEventTitleKey(eventType: string): string {
  switch (eventType) {
    case "fixture_live":
      return "activity.fixtureLiveTitle";
    case "fixture_ft":
      return "activity.fixtureFtTitle";
    case "member_joined":
      return "activity.memberJoinedTitle";
    case "ranking_change":
      return "activity.rankingChangeTitle";
    case "prediction_reminder":
      return "activity.predictionReminderTitle";
    default:
      return "activity.empty";
  }
}

export function ActivityCard({ item }: ActivityCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const meta = item.meta ?? {};
  const titleKey = getEventTitleKey(item.eventType);

  const onPress = () => {
    if (item.eventType === "fixture_live" || item.eventType === "fixture_ft") {
      const fixtureId = meta.fixtureId as number | undefined;
      if (fixtureId != null) {
        router.push(`/fixtures/${fixtureId}` as any);
        return;
      }
    }
    if (item.groupId == null) return;
    if (item.eventType === "prediction_reminder") {
      router.push(`/groups/${item.groupId}/games` as any);
    } else {
      router.push(`/groups/${item.groupId}` as any);
    }
  };

  const homeTeam = (meta.homeTeam as string) ?? "";
  const awayTeam = (meta.awayTeam as string) ?? "";
  const username = (meta.username as string) ?? "";
  const newPosition = (meta.newPosition as number) ?? 0;
  const homeScore = meta.homeScore as number | undefined;
  const awayScore = meta.awayScore as number | undefined;

  let subtitle = item.body;
  if (item.eventType === "fixture_live" && (homeTeam || awayTeam)) {
    subtitle = t("activity.fixtureLive", { homeTeam: homeTeam || "?", awayTeam: awayTeam || "?" });
  } else if (item.eventType === "fixture_ft" && (homeTeam || awayTeam)) {
    subtitle = t("activity.fixtureFt", {
      homeTeam: homeTeam || "?",
      homeScore: homeScore ?? "?",
      awayScore: awayScore ?? "?",
      awayTeam: awayTeam || "?",
    });
  } else if (item.eventType === "member_joined" && username) {
    subtitle = t("activity.memberJoined", { username });
  } else if (item.eventType === "ranking_change" && username) {
    subtitle = t("activity.rankingChange", { username, position: newPosition });
  } else if (item.eventType === "prediction_reminder" && (homeTeam || awayTeam)) {
    subtitle = t("activity.predictionReminder", {
      homeTeam: homeTeam || "?",
      awayTeam: awayTeam || "?",
    });
  }

  const isReminder = item.eventType === "prediction_reminder" || item.source === "user";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
    >
      <Card
        style={[
          styles.card,
          {
            borderColor: isReminder
              ? theme.colors.primary
              : theme.colors.border,
            borderLeftWidth: isReminder ? 4 : 1,
          },
        ]}
      >
        <View style={styles.content}>
          <AppText variant="subtitle" style={styles.title}>
            {t(titleKey as never)}
          </AppText>
          <AppText variant="body" color="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
          <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
            <AppText variant="caption" color="secondary">
              {item.groupName}
            </AppText>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: {
    gap: 6,
  },
  title: {
    fontWeight: "600",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
});
