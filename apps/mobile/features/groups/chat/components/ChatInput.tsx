// features/groups/chat/components/ChatInput.tsx
// TextInput + Send button. Typing indicator with 2 second debounce. @mentions picker. Read-only for ended groups.

import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
} from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import type { MentionData } from "@/lib/socket";
import { MentionPicker } from "./MentionPicker";
import type { MentionOption } from "./MentionPicker";

const TYPING_DEBOUNCE_MS = 2000;

interface ChatInputProps {
  onSend: (body: string, mentions?: MentionData[]) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  readOnly?: boolean;
  memberOptions: MentionOption[];
  fixtureOptions: MentionOption[];
}

export function ChatInput({
  onSend,
  onTypingStart,
  onTypingStop,
  readOnly = false,
  memberOptions,
  fixtureOptions,
}: ChatInputProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = setTimeout(() => {
      onTypingStop();
      typingStopTimerRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, [onTypingStop]);

  const handleChangeText = useCallback(
    (value: string) => {
      if (readOnly) return;
      setText(value);
      const lastAtIndex = value.lastIndexOf("@");
      if (lastAtIndex >= 0) {
        const afterAt = value.slice(lastAtIndex + 1);
        if (!afterAt.includes(" ") && afterAt.length <= 30) {
          setMentionQuery(afterAt);
        } else {
          setMentionQuery(null);
        }
      } else {
        setMentionQuery(null);
      }
      if (value.length > 0) {
        onTypingStart();
        scheduleTypingStop();
      } else {
        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }
        onTypingStop();
      }
    },
    [readOnly, onTypingStart, onTypingStop, scheduleTypingStop]
  );

  const handleMentionSelect = useCallback(
    (option: MentionOption) => {
      const lastAtIndex = text.lastIndexOf("@");
      if (lastAtIndex < 0) return;
      const before = text.slice(0, lastAtIndex);
      const newText = `${before}@${option.display} `;
      setText(newText);
      setMentionQuery(null);
      setMentions((prev) => {
        if (prev.some((m) => m.type === option.type && m.id === option.id)) {
          return prev;
        }
        return [
          ...prev,
          { type: option.type, id: option.id, display: option.display },
        ];
      });
    },
    [text]
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || readOnly) return;

    const activeMentions = mentions.filter((m) =>
      trimmed.includes(`@${m.display}`)
    );
    onSend(trimmed, activeMentions.length > 0 ? activeMentions : undefined);
    setText("");
    setMentions([]);
    setMentionQuery(null);
    onTypingStop();
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    Keyboard.dismiss();
  }, [text, readOnly, onSend, onTypingStop, mentions]);

  const canSend = text.trim().length > 0 && !readOnly;

  if (readOnly) {
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
        <AppText variant="caption" color="secondary" style={styles.readOnlyText}>
          Chat is read-only for ended groups
        </AppText>
      </View>
    );
  }

  return (
    <>
      {mentionQuery !== null && (
        <MentionPicker
          query={mentionQuery}
          members={memberOptions}
          fixtures={fixtureOptions}
          onSelect={handleMentionSelect}
        />
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder={t("chat.typePlaceholder")}
        placeholderTextColor={theme.colors.textSecondary}
        value={text}
        onChangeText={handleChangeText}
        multiline
        maxLength={2000}
        editable={!readOnly}
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: canSend ? theme.colors.primary : theme.colors.surface,
            opacity: pressed && canSend ? 0.8 : 1,
          },
        ]}
      >
        <AppText
          variant="body"
          style={{
            color: canSend ? theme.colors.primaryText : theme.colors.textSecondary,
            fontWeight: "600",
          }}
        >
          Send
        </AppText>
      </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
  },
  readOnlyText: {
    textAlign: "center",
    paddingVertical: 12,
  },
});
