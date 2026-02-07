// features/profile/stats/components/BadgesCard.tsx
// 2x3 grid of badge items (icon + name + locked/earned state + progress bar).

import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiBadge } from "@repo/types";
import {
  Ionicons,
  FontAwesome5,
  FontAwesome6,
  AntDesign,
  MaterialIcons,
} from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { BadgesInfoSheet } from "./BadgesInfoSheet";

interface BadgesCardProps {
  badges: ApiBadge[];
}

const BADGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  streak_master: "flash",
  group_champion: "medal",
  consistency_king: "stats-chart",
};

function BadgeItem({ badge }: { badge: ApiBadge }) {
  const { theme } = useTheme();
  const iconColor = badge.earned
    ? theme.colors.primary
    : theme.colors.textSecondary;

  const renderIcon = () => {
    if (badge.id === "early_bird") {
      return (
        <FontAwesome5
          name="earlybirds"
          size={24}
          color={iconColor}
          style={styles.icon}
        />
      );
    }
    if (badge.id === "underdog_caller") {
      return (
        <FontAwesome6
          name="shield-dog"
          size={24}
          color={iconColor}
          style={styles.icon}
        />
      );
    }
    if (badge.id === "sharpshooter") {
      return (
        <AntDesign name="aim" size={24} color={iconColor} style={styles.icon} />
      );
    }
    const iconName = BADGE_ICONS[badge.id] ?? "ribbon";
    return (
      <Ionicons
        name={iconName}
        size={24}
        color={iconColor}
        style={styles.icon}
      />
    );
  };

  return (
    <View style={[styles.badgeItem, { padding: theme.spacing.sm }]}>
      {renderIcon()}
      <AppText variant="caption" numberOfLines={2} style={styles.name}>
        {badge.name}
      </AppText>
      <View
        style={[styles.progressBar, { backgroundColor: theme.colors.border }]}
      >
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
  const { theme } = useTheme();
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  return (
    <Card>
      <View style={styles.titleRow}>
        <AppText variant="subtitle">Badges</AppText>
        <Pressable onPress={() => sheetRef.current?.present()} hitSlop={10}>
          <MaterialIcons
            name="help-outline"
            size={20}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <BadgeItem key={badge.id} badge={badge} />
        ))}
      </View>
      <BadgesInfoSheet sheetRef={sheetRef} badges={badges} />
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
