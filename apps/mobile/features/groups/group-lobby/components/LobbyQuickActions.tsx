// features/groups/group-lobby/components/LobbyQuickActions.tsx
// Predict banner — gradient card similar to PredictAllBanner in groups list.
// Shows unpredicted count and CTA to predict. Hidden when all predicted.

import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { spacing, radius } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

export interface QuickAction {
  icon: "cards" | "chat" | "stats" | "activity";
  label: string;
  badge?: number;
  onPress: () => void;
}

export interface LobbyQuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
  unpredictedCount?: number;
  predictableCount?: number;
}

function LobbyQuickActionsInner({
  actions,
  isLoading = false,
  unpredictedCount = 0,
  predictableCount = 0,
}: LobbyQuickActionsProps) {
  const { t } = useTranslation("common");
  const cardsAction = actions.find((a) => a.icon === "cards");

  if (isLoading || unpredictedCount === 0 || !cardsAction) return null;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cardsAction.onPress();
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
        <View style={styles.content}>
          <Text style={styles.heroNumber}>{unpredictedCount}</Text>
          <View style={styles.textCol}>
            <Text style={styles.title}>
              {t("groups.predictAllGamesLabel")}
            </Text>
            <Text style={styles.subtitle}>
              {t("lobby.predictionsLeft", { count: unpredictedCount, total: predictableCount })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export const LobbyQuickActions = React.memo(LobbyQuickActionsInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.sm,
    ...getShadowStyle("md"),
  },
  gradient: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.ms,
  },
  heroNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 32,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)",
  },
});
