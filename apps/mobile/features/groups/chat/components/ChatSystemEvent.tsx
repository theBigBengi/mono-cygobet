// features/groups/chat/components/ChatSystemEvent.tsx
// System events (joined, game started, FT, ranking) — centered pill with surface bg.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import type { ChatMessage } from "@/lib/socket";

interface ChatSystemEventProps {
  message: ChatMessage;
}

export function ChatSystemEvent({ message }: ChatSystemEventProps) {
  const { theme } = useTheme();

  if (message.type !== "system_event") return null;

  return (
    <View style={{ alignItems: "center", marginVertical: theme.spacing.sm, marginHorizontal: theme.spacing.md }}>
      <View
        style={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.surface,
        }}
      >
        <AppText variant="caption" color="secondary" style={styles.text}>
          {message.body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
  },
});
