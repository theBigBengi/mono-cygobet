import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { useTheme } from "@/lib/theme";

export function DegradedBanner() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const auth = useAuth();

  const handleRetry = async () => {
    try {
      const refreshResult = await auth.refreshAccessToken();
      if (refreshResult.ok) {
        await auth.loadUser();
      }
    } catch (err) {
      // ignore - AuthProvider will map errors into status
    }
  };

  if (auth.status !== "degraded") return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.warning, borderBottomColor: theme.colors.warning }]}>
      <Text style={[styles.text, { color: theme.colors.warningText }]}>
        {t("common.limitedConnectivity")}
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: theme.colors.warningText }]}
        onPress={handleRetry}
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}
      >
        <Text style={[styles.buttonText, { color: theme.colors.warning }]}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
