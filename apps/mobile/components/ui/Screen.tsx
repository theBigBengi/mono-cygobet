// components/ui/Screen.tsx
// Consistent screen layout wrapper.
// - Uses SafeAreaView
// - Applies consistent padding and background
// - Optional scroll support

import React from "react";
import { ScrollView, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

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
  const { theme } = useTheme();

  if (scroll) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              padding: theme.spacing.md,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </SafeAreaView>
  );
}
