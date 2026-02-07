// features/profile/stats/components/HeroHeader.tsx
// Gradient hero section with avatar, username, key stats, level & streak.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface HeroHeaderProps {
  username: string | null;
  image: string | null;
  totalPoints: number;
  accuracy: number;
  bestRank: number | null;
  level: number;
  dailyStreak: number;
  showEditButton?: boolean;
  onEditPress?: () => void;
}

function getInitials(username: string | null): string {
  if (!username || !username.trim()) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statPill}>
      <AppText variant="title" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

export function HeroHeader({
  username,
  image,
  totalPoints,
  accuracy,
  bestRank,
  level,
  dailyStreak,
  showEditButton,
  onEditPress,
}: HeroHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const primaryDark = (theme.colors as { primaryDark?: string }).primaryDark;
  const gradientColors = [
    theme.colors.primary,
    primaryDark ?? theme.colors.primary,
  ];
  const initials = getInitials(username);

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {showEditButton && (
        <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={10}>
          <MaterialIcons name="edit" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <AppText variant="title" style={styles.initials}>
            {initials}
          </AppText>
        </View>
      </View>

      <AppText variant="title" style={styles.username}>
        @{username || "unknown"}
      </AppText>

      <View style={styles.statsRow}>
        <StatPill
          value={totalPoints.toLocaleString()}
          label={t("predictions.pts")}
        />
        <StatPill value={`${accuracy}%`} label={t("profile.accuracy")} />
        <StatPill
          value={bestRank != null ? `#${bestRank}` : "-"}
          label={t("profile.bestRank")}
        />
      </View>

      <View style={styles.badgesRow}>
        {dailyStreak > 0 && (
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>
              🔥 {dailyStreak} {t("profile.dayStreak")}
            </AppText>
          </View>
        )}
        <View style={styles.badge}>
          <AppText style={styles.badgeText}>
            ⭐ {t("profile.level")} {level}
          </AppText>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  initials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  username: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 90,
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
});
