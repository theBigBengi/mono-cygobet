// src/app-shell/appbar/AppBarButton.tsx
// Small button component optimized for AppBar slots.
// Used internally by AppBar for slot content.
// Accepts ReactNode children for flexibility.

import React from "react";
import { Pressable, StyleSheet, PressableProps } from "react-native";
import { useTheme } from "@/lib/theme";

interface AppBarButtonProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: PressableProps["style"];
}

/**
 * Small button component for AppBar slots.
 * Optimized for compact space (height: 44px, padding: 8px).
 */
export function AppBarButton({
  children,
  style,
  ...props
}: AppBarButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: 44,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          alignItems: "center",
          justifyContent: "center",
          ...(pressed && { opacity: 0.7 }),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}


