// features/profile/stats/components/WelcomeCard.tsx
// Welcome card for new users with no settled predictions.

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Card, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export function WelcomeCard() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <Card>
      <View style={[styles.container, { paddingVertical: theme.spacing.lg }]}>
        <Ionicons
          name="football-outline"
          size={48}
          color={theme.colors.textSecondary}
        />
        <AppText variant="subtitle" style={[styles.title, { marginTop: theme.spacing.md }]}>
          {t("profile.welcomeTitle")}
        </AppText>
        <AppText variant="body" color="secondary" style={[styles.subtitle, { marginTop: theme.spacing.sm, marginBottom: theme.spacing.ml }]}>
          {t("profile.welcomeSubtitle")}
        </AppText>
        <Button
          label={t("profile.joinGroup")}
          variant="primary"
          onPress={() => router.push("/(tabs)/groups")}
          style={[styles.button, { marginBottom: theme.spacing.ms }]}
        />
        <Pressable onPress={() => router.push("/groups/discover")} hitSlop={10}>
          <AppText variant="body" color="primary" style={styles.browseText}>
            {t("profile.browsePublicGroups")}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  title: {},
  subtitle: {
    textAlign: "center",
  },
  button: {
    width: "100%",
  },
  browseText: {
    fontWeight: "600",
  },
});
