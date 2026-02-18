// features/settings/components/SettingsSection.tsx

import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function SettingsSection({
  title,
  children,
  collapsible = false,
  defaultExpanded = false,
}: SettingsSectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const titleContent = title ? (
    <AppText
      variant="caption"
      color="secondary"
      style={[styles.title, !collapsible && { marginBottom: theme.spacing.xs }]}
    >
      {title.toUpperCase()}
    </AppText>
  ) : null;

  return (
    <View style={styles.container}>
      {title &&
        (collapsible ? (
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            style={styles.collapsibleTitleRow}
          >
            {titleContent}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textSecondary}
              style={styles.chevron}
            />
          </Pressable>
        ) : (
          titleContent
        ))}
      {(!collapsible || expanded) && (
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
      )}
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
  collapsibleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginEnd: 16,
    marginBottom: 8,
  },
  chevron: {
    marginStart: 4,
  },
  content: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
