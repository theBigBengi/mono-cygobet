// features/profile/stats/components/HeroHeader.tsx
// Clean hero section with avatar, username, and key stats (accuracy, predictions, exact, correct).

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

interface HeroHeaderProps {
  username: string | null;
  image: string | null;
  accuracy: number;
  totalPredictions: number;
  exactPredictions: number;
  correctPredictions: number;
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

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statBox}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

export function HeroHeader({
  username,
  image,
  accuracy,
  totalPredictions,
  exactPredictions,
  correctPredictions,
  showEditButton,
  onEditPress,
}: HeroHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const initials = getInitials(username);
  void image;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {showEditButton && (
        <Pressable style={styles.editButton} onPress={onEditPress} hitSlop={10}>
          <MaterialIcons name="edit" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      )}

      <View style={styles.avatar}>
        <AppText style={styles.initials}>{initials}</AppText>
      </View>

      <AppText style={styles.username}>{username || "unknown"}</AppText>

      <View style={styles.statsGrid}>
        <StatBox value={`${accuracy}%`} label={t("profile.accuracy")} />
        <StatBox
          value={totalPredictions.toLocaleString()}
          label={t("profile.predictions")}
        />
        <StatBox value={exactPredictions} label={t("profile.exactShort")} />
        <StatBox value={correctPredictions} label={t("profile.correctShort")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "visible",
  },
  editButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "visible",
  },
  initials: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 28,
  },
  username: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    overflow: "visible",
  },
  statBox: {
    width: "45%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    overflow: "visible",
  },
  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 4,
  },
});
