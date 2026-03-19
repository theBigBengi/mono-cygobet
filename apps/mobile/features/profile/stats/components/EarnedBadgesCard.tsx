// features/profile/stats/components/EarnedBadgesCard.tsx
// Displays badges earned from official groups.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiEarnedBadge } from "@repo/types";
import { formatDate } from "@/utils/date";

interface EarnedBadgesCardProps {
  badges: ApiEarnedBadge[];
}

function EarnedBadgeRow({ badge }: { badge: ApiEarnedBadge }) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <View
      style={[styles.badgeRow, { borderBottomColor: theme.colors.border, paddingVertical: theme.spacing.ms }]}
    >
      <View style={[styles.iconWrap, { marginEnd: theme.spacing.ms, marginTop: theme.spacing.xxs }]}>
        {badge.icon.startsWith("http") ? (
          <Image
            source={badge.icon}
            style={[styles.iconImage, { borderRadius: theme.radius.xs }]}
            cachePolicy="disk"
          />
        ) : (
          <AppText style={styles.icon}>{badge.icon}</AppText>
        )}
      </View>
      <View style={styles.content}>
        <AppText variant="body" style={[styles.name, { marginBottom: theme.spacing.xxs }]}>
          {badge.name}
        </AppText>
        <AppText variant="caption" color="secondary">
          {t("badges.earnedIn", { group: badge.groupName })}
        </AppText>
        <AppText variant="caption" color="secondary">
          {formatDate(badge.earnedAt)}
        </AppText>
      </View>
    </View>
  );
}

export function EarnedBadgesCard({ badges }: EarnedBadgesCardProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  if (badges.length === 0) return null;

  return (
    <Card>
      <AppText variant="subtitle" style={[styles.title, { marginBottom: theme.spacing.ms }]}>
        {t("badges.earned")}
      </AppText>
      {badges.map((badge) => (
        <EarnedBadgeRow key={badge.id} badge={badge} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {},
  badgeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {},
  icon: {
    fontSize: 24,
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  content: {
    flex: 1,
  },
  name: {
    fontWeight: "600",
  },
});
