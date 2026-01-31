// components/ui/ScreenWithHeader.tsx
// Unified header + content wrapper for sub-routes.
// Back button with fallback, optional title and right content, theme background.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { useGoBack } from "@/hooks/useGoBack";
import { GroupGamesHeader } from "@/features/groups/predictions/components/GroupGamesHeader";

export interface ScreenWithHeaderProps {
  children: React.ReactNode;
  /** Optional title shown next to back button */
  title?: string;
  /** Optional right-side content (settings icon, status badge, etc.) */
  rightContent?: React.ReactNode;
  /** Fallback route when no history exists. Defaults to "/(tabs)/groups" */
  fallbackRoute?: string;
}

export function ScreenWithHeader({
  children,
  title,
  rightContent,
  fallbackRoute = "/(tabs)/groups",
}: ScreenWithHeaderProps) {
  const { theme } = useTheme();
  const goBack = useGoBack(fallbackRoute);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <GroupGamesHeader
        backOnly
        onBack={goBack}
        title={title}
        rightContent={rightContent}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
