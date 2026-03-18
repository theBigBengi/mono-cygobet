import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";
import { usePredictableGroups } from "../hooks/usePredictableGroups";

export function PredictAllBanner() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { totalUnpredicted, totalGroups } = usePredictableGroups();

  if (totalUnpredicted === 0) return null;

  const summaryText =
    totalGroups === 1
      ? t("groups.predictAllBannerSingle", { count: totalUnpredicted })
      : t("groups.predictAllBanner", {
          count: totalUnpredicted,
          groups: totalGroups,
        });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/groups/predict-all");
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.cardBackground },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.border }]}>
          <MaterialCommunityIcons
            name="cards-outline"
            size={16}
            color={theme.colors.textPrimary}
          />
        </View>
        <AppText variant="label" color="secondary" style={{ flex: 1 }}>
          {summaryText}
        </AppText>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderRadius: 18,
    ...getShadowStyle("sm"),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: 8,
  },
});
