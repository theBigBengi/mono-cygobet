// components/ui/Divider.tsx
// Simple divider line component.

import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface DividerProps {
  style?: View["props"]["style"];
}

export function Divider({ style }: DividerProps) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: "100%",
  },
});

