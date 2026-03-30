// features/settings/components/SettingsSection.tsx
// Modern grouped settings section — iOS-style rounded card.

import React, { useState } from "react";
import { View, StyleSheet, Pressable, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getShadowStyle } from "@/lib/theme/shadows";

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** Optional override style for the card wrapper */
  cardStyle?: ViewStyle;
  /** Optional override style for the outer container */
  containerStyle?: ViewStyle;
}

export function SettingsSection({
  title,
  children,
  collapsible = false,
  defaultExpanded = false,
  cardStyle,
  containerStyle,
}: SettingsSectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const titleContent = title ? (
    <AppText
      variant="caption"
      color="secondary"
      style={[styles.title, { marginStart: theme.spacing.md }, !collapsible && { marginBottom: theme.spacing.xs }]}
    >
      {title.toUpperCase()}
    </AppText>
  ) : null;

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.lg }, containerStyle]}>
      {title &&
        (collapsible ? (
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            style={[styles.collapsibleTitleRow, { marginEnd: theme.spacing.md, marginBottom: theme.spacing.sm }]}
          >
            {titleContent}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textSecondary}
              style={[styles.chevron, { marginStart: theme.spacing.xs }]}
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
              borderRadius: theme.radius.xl,
              ...getShadowStyle("md"),
            },
            cardStyle,
          ]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  collapsibleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chevron: {},
  content: {
    overflow: "hidden",
  },
});
