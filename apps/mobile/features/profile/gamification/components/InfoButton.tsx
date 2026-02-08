import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

interface InfoButtonProps {
  onPress: () => void;
}

export function InfoButton({ onPress }: InfoButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.button}>
      <MaterialIcons
        name="help-outline"
        size={20}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});
