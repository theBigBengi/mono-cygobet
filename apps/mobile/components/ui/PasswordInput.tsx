// components/ui/PasswordInput.tsx
// Reusable password input with show/hide toggle.

import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  editable?: boolean;
  style?: TextInputProps["style"];
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  editable = true,
  style,
  ...rest
}: PasswordInputProps) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: "transparent",
            color: theme.colors.textPrimary,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          placeholderTextColor ?? theme.colors.textSecondary
        }
        editable={editable}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      <Pressable onPress={toggle} style={styles.iconWrap} hitSlop={8}>
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 0,
    padding: 0,
    paddingRight: 32,
    fontSize: 16,
  },
  iconWrap: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
});
