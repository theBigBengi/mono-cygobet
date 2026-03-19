// components/ui/EmptyState.tsx
// Reusable empty state — icon + title + subtitle + optional action.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <Ionicons
          name={icon}
          size={48}
          color={theme.colors.textDisabled}
          style={styles.icon}
        />
      ) : null}
      <AppText
        variant="subtitle"
        style={{ color: theme.colors.textPrimary, textAlign: "center" }}
      >
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          variant="body"
          style={{
            color: theme.colors.textSecondary,
            textAlign: "center",
            marginTop: theme.spacing.xs,
          }}
        >
          {subtitle}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Button variant="primary" onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48, // spacing.xxl
    paddingHorizontal: 32, // spacing.xl
  },
  icon: {
    marginBottom: 16, // spacing.md
  },
});
