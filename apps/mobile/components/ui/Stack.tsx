// components/ui/Stack.tsx
// Vertical stack primitive with consistent gaps.
// - Standardized spacing

import React from "react";
import { View, ViewProps } from "react-native";

interface StackProps extends ViewProps {
  children: React.ReactNode;
  gap?: number;
}

export function Stack({ children, style, gap, ...props }: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: "column",
        },
        gap !== undefined && { gap },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

