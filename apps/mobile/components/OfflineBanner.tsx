import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useIsOnline } from "@/lib/connectivity/useIsOnline";
import { useTheme } from "@/lib/theme";

export function OfflineBanner() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.danger + "18", borderBottomColor: theme.colors.danger + "30" }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={16} color={theme.colors.danger} />
      <Text style={[styles.text, { color: theme.colors.danger }]}>{t("errors.noInternet")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
