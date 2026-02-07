// features/settings/components/SettingsSection.tsx

import React from "react";
import { View, StyleSheet } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <AppText
        variant="caption"
        color="secondary"
        style={[styles.title, { marginBottom: theme.spacing.xs }]}
      >
        {title.toUpperCase()}
      </AppText>
      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    marginStart: 16,
    fontWeight: "500",
  },
  content: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
