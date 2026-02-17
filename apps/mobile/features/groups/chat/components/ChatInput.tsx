// features/groups/chat/components/ChatInput.tsx
// TextInput + Send button. Typing indicator with 2 second debounce. @mentions picker. Read-only for ended groups.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import type { MentionData } from "@/lib/socket";
import { MentionPicker } from "./MentionPicker";
import type { MentionOption } from "./MentionPicker";

const TYPING_DEBOUNCE_MS = 2000;
const MAX_MENTION_QUERY_LENGTH = 30;

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
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLengthRef = useRef(0);
  const lastCursorRef = useRef(0);
  const mentionStartRef = useRef(0);
  const textRef = useRef("");

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  textRef.current = text;

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = setTimeout(() => {
      onTypingStop();
      typingStopTimerRef.current = null;
    }, TYPING_DEBOUNCE_MS);
  }, [onTypingStop]);

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { start } = e.nativeEvent.selection;
      lastCursorRef.current = start;
    },
    []
  );

  const handleChangeText = useCallback(
    (value: string) => {
      if (readOnly) return;
      setText(value);
      const prevLen = lastLengthRef.current;
      const prevCursor = lastCursorRef.current;
      const newLen = value.length;
      let cursor = prevCursor;
      if (newLen > prevLen) {
        cursor = prevCursor + (newLen - prevLen);
      } else if (newLen < prevLen) {
        cursor = Math.min(prevCursor, newLen);
      }
      lastLengthRef.current = newLen;
      lastCursorRef.current = cursor;

      const beforeCursor = value.slice(0, cursor);
      const atIndex = beforeCursor.lastIndexOf("@");
      if (atIndex >= 0) {
        const afterAt = value.slice(atIndex + 1);
        if (
          !afterAt.includes(" ") &&
          afterAt.length <= MAX_MENTION_QUERY_LENGTH
        ) {
          mentionStartRef.current = atIndex;
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

  const handleMentionSelect = useCallback((option: MentionOption) => {
    const value = textRef.current;
    const start = mentionStartRef.current;
    const end = lastCursorRef.current;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newText = `${before}@${option.display} ${after}`;
    setText(newText);
    setMentionQuery(null);
    lastLengthRef.current = newText.length;
    lastCursorRef.current = start + option.display.length + 2; // "@" + display + " "
    setMentions((prev) => {
      if (prev.some((m) => m.type === option.type && m.id === option.id)) {
        return prev;
      }
      return [
        ...prev,
        { type: option.type, id: option.id, display: option.display },
      ];
    });
  }, []);

  const handleCloseMentionPicker = useCallback(() => {
    const value = textRef.current;
    const start = mentionStartRef.current;
    const end = lastCursorRef.current;
    if (start < value.length && value[start] === "@") {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const newText = before + after;
      setText(newText);
      lastLengthRef.current = newText.length;
      lastCursorRef.current = start;
    }
    setMentionQuery(null);
  }, []);

  const handleAtPress = useCallback(() => {
    if (readOnly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const value = textRef.current;
    const cursor = lastCursorRef.current;
    const next = value.slice(0, cursor) + "@" + value.slice(cursor);
    setText(next);
    lastLengthRef.current = next.length;
    lastCursorRef.current = cursor + 1;
    mentionStartRef.current = cursor;
    setMentionQuery("");
  }, [readOnly]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || readOnly) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const activeMentions = mentions.filter((m) =>
      trimmed.includes(`@${m.display}`)
    );
    onSend(trimmed, activeMentions.length > 0 ? activeMentions : undefined);
    setText("");
    setMentions([]);
    setMentionQuery(null);
    lastLengthRef.current = 0;
    lastCursorRef.current = 0;
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
            paddingBottom: isKeyboardVisible ? 12 : Math.max(12, insets.bottom),
          },
        ]}
      >
        <AppText
          variant="caption"
          color="secondary"
          style={styles.readOnlyText}
        >
          {t("chat.readOnlyEnded")}
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
          onClose={handleCloseMentionPicker}
        />
      )}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: isKeyboardVisible ? 0 : Math.max(12, insets.bottom),
          },
        ]}
      >
        <Pressable
          onPress={handleAtPress}
          style={({ pressed }) => [
            styles.atButton,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              borderBottomColor: pressed
                ? theme.colors.border
                : theme.colors.textSecondary + "40",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <AppText variant="body" style={{ fontWeight: "700", color: theme.colors.primary }}>
            @
          </AppText>
        </Pressable>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder={t("chat.typePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          multiline
          scrollEnabled={text.split("\n").length > 3}
          maxLength={2000}
          editable={!readOnly}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: canSend
                ? theme.colors.primary
                : theme.colors.background,
              borderColor: canSend
                ? theme.colors.primary
                : theme.colors.border,
              borderBottomColor: canSend
                ? (pressed ? theme.colors.primary : "rgba(0,0,0,0.25)")
                : theme.colors.textSecondary + "40",
              transform: [{ scale: pressed && canSend ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons
            name="send"
            size={20}
            color={
              canSend ? theme.colors.primaryText : theme.colors.textSecondary
            }
          />
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
    gap: 10,
    borderTopWidth: 1,
  },
  atButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  readOnlyText: {
    textAlign: "center",
    paddingVertical: 12,
  },
});
