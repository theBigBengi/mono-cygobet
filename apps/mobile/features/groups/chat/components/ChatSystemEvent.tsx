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
          {message.body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
    marginHorizontal: 16,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    textAlign: "center",
  },
});
