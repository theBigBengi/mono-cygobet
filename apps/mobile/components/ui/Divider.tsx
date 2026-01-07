// components/ui/Divider.tsx
// Simple divider line component.

import React from "react";
import { View } from "react-native";
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
          height: 1,
          backgroundColor: theme.colors.border,
          width: "100%",
        },
        style,
      ]}
    />
  );
}

