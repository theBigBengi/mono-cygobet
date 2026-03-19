// features/groups/chat/components/ChatDateSeparator.tsx
// WhatsApp-style date separator pill between message groups.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

interface ChatDateSeparatorProps {
  label: string;
}

export function ChatDateSeparator({ label }: ChatDateSeparatorProps) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: "center", marginVertical: theme.spacing.ms, marginHorizontal: theme.spacing.md }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.surface,
        }}
      >
        <AppText variant="caption" color="secondary" style={styles.text}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
});
