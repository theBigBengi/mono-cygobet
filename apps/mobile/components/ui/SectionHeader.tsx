// components/ui/SectionHeader.tsx
// Reusable section header — title + optional "See all" link.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "./AppText";

interface SectionHeaderProps {
  title: string;
  /** Optional "See all" / action text on the right */
  actionText?: string;
  /** Callback when action text is pressed */
  onAction?: () => void;
}

export function SectionHeader({
  title,
  actionText,
  onAction,
}: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <AppText
        variant="body"
        style={{ fontWeight: "700", color: theme.colors.textPrimary }}
      >
        {title}
      </AppText>
      {actionText && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppText
            variant="label"
            style={{ color: theme.colors.primary }}
          >
            {actionText}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8, // spacing.sm — title to content gap
  },
});
