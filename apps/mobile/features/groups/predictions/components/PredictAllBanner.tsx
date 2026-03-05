import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
    router.push("/groups/predict-all" as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.border + "60" },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconCircle, { borderColor: theme.colors.textPrimary + "40" }]}>
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
    borderRadius: 10,
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
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
});
