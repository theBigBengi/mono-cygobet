import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useIsOnline } from "@/lib/connectivity/useIsOnline";

export function OfflineBanner() {
  const { t } = useTranslation("common");
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline" size={16} color="#842029" />
      <Text style={styles.text}>{t("errors.noInternet")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f8d7da",
    borderBottomWidth: 1,
    borderBottomColor: "#f5c2c7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    color: "#842029",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
