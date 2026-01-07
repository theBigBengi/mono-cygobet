// components/ui/Screen.tsx
// Consistent screen layout wrapper.
// - Uses SafeAreaView
// - Applies consistent padding and background
// - Optional scroll support

import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing } from "@/theme";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  contentContainerStyle,
}: ScreenProps) {
  const containerStyle = [styles.container];

  if (scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={containerStyle}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
});

