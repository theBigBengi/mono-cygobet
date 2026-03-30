import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useTheme, spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { usePredictableGroups } from "../hooks/usePredictableGroups";

export function PredictAllBanner() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { totalUnpredicted, totalGroups } = usePredictableGroups();

  if (totalUnpredicted === 0) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/groups/predict-all");
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
      ]}
    >
      <LinearGradient
        colors={["#007AFF", "#5856D6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Info row: big number + description */}
        <View style={styles.infoRow}>
          <Text style={styles.heroNumber}>{totalUnpredicted}</Text>
          <View style={styles.textCol}>
            <Text style={styles.label}>
              {t("groups.predictAllGamesLabel")}
            </Text>
            {totalGroups > 1 && (
              <Text style={styles.subtitle}>
                {t("groups.predictAllAcrossGroups", { count: totalGroups })}
              </Text>
            )}
          </View>
        </View>

        {/* CTA button */}
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>{t("groups.predictAll").toUpperCase()}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.ms,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  gradient: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroNumber: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 44,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
  ctaButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.full,
    paddingVertical: spacing.ms,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
