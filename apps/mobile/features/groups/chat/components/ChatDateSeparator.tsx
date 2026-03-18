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
    <View style={styles.container}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <AppText variant="caption" color="secondary" style={styles.text}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 12,
    marginHorizontal: 16,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
});
