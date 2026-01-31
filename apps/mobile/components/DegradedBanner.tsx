import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";

export function DegradedBanner() {
  const { t } = useTranslation("common");
  const auth = useAuth();

  const handleRetry = async () => {
    try {
      // Attempt recovery: refresh token then load user if needed.
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
    <View style={styles.container}>
      <Text style={styles.text}>{t("common.limitedConnectivity")}</Text>
      <Pressable style={styles.button} onPress={handleRetry}>
        <Text style={styles.buttonText}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    backgroundColor: "#fff3cd",
    borderBottomWidth: 1,
    borderBottomColor: "#ffeeba",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    color: "#856404",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#856404",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

