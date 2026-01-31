// features/groups/chat/components/ChatTypingIndicator.tsx
// "X is typing..." / "X and Y are typing..." above the input.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

type TypingUser = { userId: number; username: string | null };

interface ChatTypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId: number;
}

function formatTypingLabel(users: TypingUser[], currentUserId: number): string {
  const others = users.filter((u) => u.userId !== currentUserId);
  if (others.length === 0) return "";

  const names = others.map((u) => u.username || `Someone`);

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }
  return `${names[0]} and ${names.length - 1} others are typing...`;
}

export function ChatTypingIndicator({
  typingUsers,
  currentUserId,
}: ChatTypingIndicatorProps) {
  const { theme } = useTheme();

  const label = formatTypingLabel(typingUsers, currentUserId);
  if (!label) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <AppText variant="caption" color="secondary" style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  text: {
    fontStyle: "italic",
  },
});
