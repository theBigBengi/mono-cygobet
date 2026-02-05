// features/groups/chat/components/ChatTypingIndicator.tsx
// "X is typing..." / "X and Y are typing..." above the input.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

type TypingUser = { userId: number; username: string | null };

interface ChatTypingIndicatorProps {
  typingUsers: TypingUser[];
  currentUserId: number;
}

function formatTypingLabel(
  users: TypingUser[],
  currentUserId: number,
  t: (key: string, opts?: Record<string, string | number>) => string
): string {
  const others = users.filter((u) => u.userId !== currentUserId);
  if (others.length === 0) return "";

  const names = others.map((u) => u.username ?? t("chat.someone"));

  if (names.length === 1) {
    return t("chat.isTypingOne", { name: names[0] });
  }
  if (names.length === 2) {
    return t("chat.isTypingTwo", { name1: names[0], name2: names[1] });
  }
  return t("chat.isTypingMany", { name: names[0], count: names.length - 1 });
}

export function ChatTypingIndicator({
  typingUsers,
  currentUserId,
}: ChatTypingIndicatorProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");

  const label = formatTypingLabel(typingUsers, currentUserId, t);
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
