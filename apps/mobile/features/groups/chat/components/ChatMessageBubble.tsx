// features/groups/chat/components/ChatMessageBubble.tsx
// Message bubble for user messages — yours on right (primary bg), others on left (surface bg). Mentions highlighted.

import React from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { formatTime24Locale } from "@/lib/i18n/i18n.date";
import type { Locale } from "@/lib/i18n/i18n.types";
import { isLocale } from "@/lib/i18n/i18n.types";
import type { ChatMessage, MentionData } from "@/lib/socket";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

function getCurrentLocale(): Locale {
  const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  return isLocale(lang) ? lang : "en";
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return formatTime24Locale(date, getCurrentLocale());
}

function parseMentions(
  body: string,
  meta: Record<string, unknown> | null
): Array<{ text: string; mention: MentionData | null }> {
  const mentions = (meta?.mentions ?? []) as MentionData[];
  if (mentions.length === 0) return [{ text: body, mention: null }];

  const markers = mentions.map((m) => ({
    pattern: `@${m.display}`,
    mention: m,
  }));

  const segments: Array<{ text: string; mention: MentionData | null }> = [];
  let remaining = body;

  while (remaining.length > 0) {
    let earliest: { index: number; marker: (typeof markers)[0] } | null = null;
    for (const marker of markers) {
      const idx = remaining.indexOf(marker.pattern);
      if (idx >= 0 && (earliest === null || idx < earliest.index)) {
        earliest = { index: idx, marker };
      }
    }

    if (earliest === null) {
      segments.push({ text: remaining, mention: null });
      break;
    }

    if (earliest.index > 0) {
      segments.push({
        text: remaining.slice(0, earliest.index),
        mention: null,
      });
    }

    segments.push({
      text: earliest.marker.pattern,
      mention: earliest.marker.mention,
    });

    remaining = remaining.slice(
      earliest.index + earliest.marker.pattern.length
    );
  }

  return segments;
}

export function ChatMessageBubble({
  message,
  isCurrentUser,
}: ChatMessageBubbleProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");

  if (message.type !== "user_message") return null;

  const displayName =
    message.sender?.username ??
    t("chat.playerFallback", { id: message.senderId ?? "?" });

  const bubbleBg = isCurrentUser ? theme.colors.primary : theme.colors.surface;
  const bubbleStyle = [
    styles.bubble,
    {
      backgroundColor: bubbleBg,
      borderBottomRightRadius: isCurrentUser ? 4 : 16,
      borderBottomLeftRadius: isCurrentUser ? 16 : 4,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.containerRight : styles.containerLeft,
      ]}
    >
      {!isCurrentUser &&
        (message.sender?.image ? (
          <Image
            source={{ uri: message.sender.image }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarFallback,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <AppText variant="caption" style={styles.avatarInitial}>
              {(displayName.charAt(0) || "?").toUpperCase()}
            </AppText>
          </View>
        ))}
      <View style={bubbleStyle}>
        {!isCurrentUser && (
          <AppText
            variant="caption"
            color="secondary"
            style={styles.senderName}
          >
            {displayName}
          </AppText>
        )}
        <AppText
          variant="body"
          style={{
            color: isCurrentUser
              ? theme.colors.primaryText
              : theme.colors.textPrimary,
          }}
        >
          {parseMentions(message.body, message.meta).map((segment, i) =>
            segment.mention ? (
              <Text
                key={i}
                style={{
                  fontWeight: "700",
                  color: isCurrentUser ? "#fff" : theme.colors.primary,
                }}
              >
                {segment.text}
              </Text>
            ) : (
              <Text key={i}>{segment.text}</Text>
            )
          )}
        </AppText>
        <AppText
          variant="caption"
          style={[
            styles.time,
            {
              color: isCurrentUser
                ? "rgba(255,255,255,0.8)"
                : theme.colors.textSecondary,
              textAlign: isCurrentUser ? "right" : "left",
            },
          ]}
        >
          {formatMessageTime(message.createdAt)}
        </AppText>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  containerLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  containerRight: {
    alignItems: "flex-end",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "600",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  senderName: {
    marginBottom: 4,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
  },
});
