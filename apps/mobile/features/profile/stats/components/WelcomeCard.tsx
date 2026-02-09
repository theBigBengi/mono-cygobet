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
      <View style={styles.container}>
        <Ionicons
          name="football-outline"
          size={48}
          color={theme.colors.textSecondary}
        />
        <AppText variant="subtitle" style={styles.title}>
          {t("profile.welcomeTitle")}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          {t("profile.welcomeSubtitle")}
        </AppText>
        <Button
          label={t("profile.joinGroup")}
          variant="primary"
          onPress={() => router.push("/(tabs)/home")}
          style={styles.button}
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
    paddingVertical: 24,
  },
  title: {
    marginTop: 16,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    marginBottom: 12,
  },
  browseText: {
    fontWeight: "600",
  },
});
