import React from "react";
import { View, StyleSheet } from "react-native";
import { Foundation } from "@expo/vector-icons";

type Props = {
  expanded: boolean;
  size?: number;
  color: string;
};

export function TextModeIcon({ expanded, size = 18, color }: Props) {
  return (
    <View style={styles.rotated}>
      <Foundation name={expanded ? "arrows-expand" : "arrows-compress"} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  rotated: {
    transform: [{ rotate: "45deg" }],
  },
});
