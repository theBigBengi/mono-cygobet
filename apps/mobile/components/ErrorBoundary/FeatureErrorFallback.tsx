// components/ErrorBoundary/FeatureErrorFallback.tsx
// Themed fallback UI for feature-level error boundaries.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FallbackProps } from "react-error-boundary";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();

  const handleGoHome = () => {
    resetErrorBoundary();
    router.replace("/(tabs)/groups" as any);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={theme.colors.danger}
        style={styles.icon}
      />

      <AppText variant="title" style={styles.title}>
        {t("errors.somethingWentWrongTitle")}
      </AppText>

      <AppText variant="body" color="secondary" style={styles.message}>
        {t("errors.unexpected")}
      </AppText>

      {__DEV__ && (
        <AppText variant="caption" color="secondary" style={styles.devError}>
          {error.message}
        </AppText>
      )}

      <View style={styles.buttons}>
        <Button
          label={t("errors.tryAgain")}
          onPress={resetErrorBoundary}
          variant="primary"
          style={styles.button}
        />
        <Button
          label={t("errors.goToHome")}
          onPress={handleGoHome}
          variant="secondary"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
  },
  devError: {
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "monospace",
    fontSize: 12,
  },
  buttons: {
    gap: 12,
    width: "100%",
  },
  button: {
    width: "100%",
  },
});
