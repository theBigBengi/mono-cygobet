import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { RankTier } from "@repo/types";

interface RankTierBadgeProps {
  tier: RankTier;
  progress: number;
}

const TIER_CONFIG: Record<
  RankTier,
  { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  bronze: { color: "#CD7F32", label: "Bronze", icon: "shield" },
  silver: { color: "#C0C0C0", label: "Silver", icon: "shield" },
  gold: { color: "#FFD700", label: "Gold", icon: "shield" },
  platinum: { color: "#E5E4E2", label: "Platinum", icon: "shield" },
  diamond: { color: "#B9F2FF", label: "Diamond", icon: "trophy" },
};

export function RankTierBadge({ tier, progress }: RankTierBadgeProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const config = TIER_CONFIG[tier];

  return (
    <Card>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: config.color + "20" }]}>
          <Ionicons name={config.icon} size={32} color={config.color} />
        </View>
        <View style={styles.info}>
          <AppText variant="subtitle">{config.label}</AppText>
          <AppText variant="caption" color="secondary">
            {t("gamification.rank")}
          </AppText>
        </View>
      </View>

      {tier !== "diamond" && (
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <AppText variant="caption" color="secondary">
              {t("gamification.nextRank")}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              style={styles.progressPercent}
            >
              {progress}%
            </AppText>
          </View>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: config.color },
              ]}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  progressSection: {
    marginTop: 16,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressPercent: {
    minWidth: 44,
    flexShrink: 0,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});
