// features/profile/stats/components/BadgesCard.tsx
// Badge list with current/target, progress bar, and info sheet.

import React, { useRef } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
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

function BadgeIcon({
  badgeId,
  color,
  size = 24,
}: {
  badgeId: string;
  color: string;
  size?: number;
}) {
  if (badgeId === "sharpshooter") {
    return <AntDesign name="aim" size={size} color={color} />;
  }
  if (badgeId === "underdog_caller") {
    return <FontAwesome6 name="shield-dog" size={size} color={color} />;
  }
  if (badgeId === "early_bird") {
    return <FontAwesome5 name="earlybirds" size={size} color={color} />;
  }
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    streak_master: "flash",
    group_champion: "medal",
    consistency_king: "stats-chart",
  };
  const name = iconMap[badgeId] ?? "ribbon";
  return <Ionicons name={name} size={size} color={color} />;
}

function BadgeRow({ badge }: { badge: ApiBadge }) {
  const { theme } = useTheme();
  const iconColor = badge.earned
    ? theme.colors.primary
    : theme.colors.textSecondary;

  return (
    <View style={[styles.badgeRow, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.badgeRowInner}>
        <View style={styles.badgeIconWrap}>
          <BadgeIcon badgeId={badge.id} color={iconColor} />
        </View>
        <View style={styles.badgeContent}>
          <View style={styles.badgeHeader}>
            <AppText variant="body" style={styles.badgeName}>
              {badge.name}
            </AppText>
            {badge.earned ? (
              <AppText
                style={[styles.badgeStatus, { color: theme.colors.success }]}
              >
                Done ✓
              </AppText>
            ) : (
              <AppText
                style={[
                  styles.badgeStatus,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {badge.current}/{badge.target}
              </AppText>
            )}
          </View>
          <View style={styles.badgeProgress}>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.badgeDesc}
            >
              {badge.description}
            </AppText>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${badge.progress}%`,
                    backgroundColor: badge.earned
                      ? theme.colors.success
                      : theme.colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function BadgesCard({ badges }: BadgesCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const sheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  const allZero = badges.every((b) => b.progress === 0 && !b.earned);
  const sortedBadges = [...badges].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? 1 : -1;
    return b.progress - a.progress;
  });

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
      {allZero ? (
        <>
          <View style={styles.iconRow}>
            {badges.map((badge) => (
              <BadgeIcon
                key={badge.id}
                badgeId={badge.id}
                color={theme.colors.textSecondary}
                size={20}
              />
            ))}
          </View>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.badgesPreview}
          >
            {t("profile.badgesPreview", { count: badges.length })}
          </AppText>
        </>
      ) : (
        sortedBadges.map((badge) => <BadgeRow key={badge.id} badge={badge} />)
      )}
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
  badgeRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeRowInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  badgeIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  badgeContent: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeName: {
    fontWeight: "600",
  },
  badgeStatus: {
    fontSize: 14,
    fontWeight: "600",
  },
  badgeProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badgeDesc: {
    flex: 1,
  },
  progressBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  iconRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  badgesPreview: {
    textAlign: "center",
  },
});
