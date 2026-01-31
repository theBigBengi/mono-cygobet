// features/profile/stats/components/BadgesCard.tsx
// 2x3 grid of badge items (icon + name + locked/earned state + progress bar).

import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiBadge } from "@repo/types";
import { Ionicons } from "@expo/vector-icons";

interface BadgesCardProps {
  badges: ApiBadge[];
}

const BADGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sharpshooter: "bonfire",
  underdog_caller: "trophy",
  streak_master: "flash",
  group_champion: "medal",
  consistency_king: "stats-chart",
  early_bird: "sunny",
};

function BadgeItem({ badge }: { badge: ApiBadge }) {
  const { theme } = useTheme();
  const iconName = BADGE_ICONS[badge.id] ?? "ribbon";
  const iconColor = badge.earned
    ? theme.colors.primary
    : theme.colors.textSecondary;

  return (
    <View style={[styles.badgeItem, { padding: theme.spacing.sm }]}>
      <Ionicons
        name={iconName}
        size={24}
        color={iconColor}
        style={styles.icon}
      />
      <AppText
        variant="caption"
        numberOfLines={2}
        style={styles.name}
      >
        {badge.name}
      </AppText>
      <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${badge.progress}%`,
              backgroundColor: badge.earned
                ? theme.colors.primary
                : theme.colors.textSecondary,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function BadgesCard({ badges }: BadgesCardProps) {
  return (
    <Card>
      <AppText variant="subtitle" style={styles.title}>
        Badges
      </AppText>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  badgeItem: {
    width: "50%",
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    marginBottom: 4,
  },
  name: {
    textAlign: "center",
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    width: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
