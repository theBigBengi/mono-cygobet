import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
        <AppText variant="label" color="secondary">
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
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
