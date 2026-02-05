import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Screen } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation("common");

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen>
        <AppText variant="title">{t("tabs.settings")}</AppText>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
