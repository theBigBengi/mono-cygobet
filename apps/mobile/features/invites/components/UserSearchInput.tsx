// features/invites/components/UserSearchInput.tsx
// Minimal search input for username.

import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

interface UserSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function UserSearchInput({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: UserSearchInputProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.textPrimary + "08", borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.ms, paddingVertical: theme.spacing.sm, marginBottom: theme.spacing.ms },
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={theme.colors.textSecondary}
        style={[styles.icon, { marginEnd: theme.spacing.sm }]}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary + "80"}
        style={[styles.input, { color: theme.colors.textPrimary }]}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {},
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
