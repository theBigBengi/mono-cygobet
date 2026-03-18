// components/ui/Divider.tsx
// Subtle divider line — uses hairline width for modern feel.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";

interface DividerProps {
  style?: View["props"]["style"];
}

export function Divider({ style }: DividerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.border,
          width: "100%",
        },
        style,
      ]}
    />
  );
}
