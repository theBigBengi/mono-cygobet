// features/groups/chat/screens/GroupChatScreen.tsx
// Chat screen with inverted FlatList, KeyboardAvoidingView, auto markAsRead.

import React, { useCallback, useRef, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupChat, useGroupQuery, groupsKeys } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { formatChatDateSeparator } from "@/lib/i18n/i18n.date";
import { isLocale } from "@/lib/i18n/i18n.types";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { ChatSystemEvent } from "../components/ChatSystemEvent";
import { ChatDateSeparator } from "../components/ChatDateSeparator";
import { ChatInput } from "../components/ChatInput";
import { ChatTypingIndicator } from "../components/ChatTypingIndicator";
import { useMentionOptions } from "../hooks/useMentionOptions";
import { HEADER_HEIGHT } from "@/features/groups/predictions/utils/constants";
import type { FixtureItem } from "@/types/common";
import type { ChatMessage } from "@/lib/socket";

interface GroupChatScreenProps {
  groupId: number | null;
}

type ChatListItem =
  | { kind: "message"; data: ChatMessage }
  | { kind: "date_separator"; dateKey: string; label: string };

/** Get YYYY-MM-DD from an ISO string (avoids creating a Date for comparison). */
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Insert WhatsApp-style date separators into the (newest-first) messages array.
 * In an inverted FlatList the separator renders visually _above_ its day's messages.
 */
function buildChatList(
  messages: ChatMessage[],
  labels: { today: string; yesterday: string },
  locale: "en" | "he"
): ChatListItem[] {
  if (messages.length === 0) return [];

  const items: ChatListItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    items.push({ kind: "message", data: messages[i] });

    const curKey = dateKey(messages[i].createdAt);
    const nextKey =
      i < messages.length - 1 ? dateKey(messages[i + 1].createdAt) : null;

    // Insert separator after the last message of this day (or for the oldest message)
    if (nextKey === null || curKey !== nextKey) {
      items.push({
        kind: "date_separator",
        dateKey: curKey,
        label: formatChatDateSeparator(
          new Date(messages[i].createdAt),
          locale,
          labels
        ),
      });
    }
  }

  return items;
}

const ChatItem = React.memo(function ChatItem({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId: number;
}) {
  if (message.type === "user_message") {
    return (
      <ChatMessageBubble
        message={message}
        isCurrentUser={message.senderId === currentUserId}
      />
    );
  }
  return <ChatSystemEvent message={message} />;
});

export function GroupChatScreen({ groupId }: GroupChatScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const { data: groupData } = useGroupQuery(groupId, {
    includeFixtures: true,
  });
  const isEnded = groupData?.data?.status === "ended";

  const fixtures: FixtureItem[] = groupData?.data?.fixtures ?? [];
  const { memberOptions, fixtureOptions } = useMentionOptions(
    groupId,
    fixtures
  );

  const queryClient = useQueryClient();
  const {
    messages,
    sendMessage,
    typingUsers,
    triggerTypingStart,
    triggerTypingStop,
    markAsRead,
    fetchNextPage,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useGroupChat(groupId);

  // When leaving the chat screen, invalidate chat preview so lobby card updates
  useFocusEffect(
    useCallback(() => {
      return () => {
        queryClient.invalidateQueries({ queryKey: groupsKeys.chatPreview() });
      };
    }, [queryClient])
  );

  const lastMarkedRef = useRef<number>(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Sticky date header state
  const [stickyDateLabel, setStickyDateLabel] = useState<string | null>(null);
  const stickyOpacity = useRef(new Animated.Value(0)).current;
  const isScrolledRef = useRef(false);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: ChatListItem }[] }) => {
      // ── mark-as-read logic ──
      const currentMessages = messagesRef.current;
      const newest = currentMessages[0];
      if (newest && newest.id > 0) {
        const isNewestVisible = viewableItems.some(
          (v) =>
            v.item.kind === "message" &&
            (v.item.data.id === newest.id || v.item.data.tempId)
        );
        if (isNewestVisible && newest.id > lastMarkedRef.current) {
          lastMarkedRef.current = newest.id;
          markAsRead(newest.id);
        }
      }

      // ── sticky date: find topmost visible message (highest index = visual top in inverted list) ──
      let topMessage: ChatMessage | null = null;
      let topIndex = -1;
      for (const v of viewableItems) {
        if (
          v.item.kind === "message" &&
          v.index != null &&
          v.index > topIndex
        ) {
          topIndex = v.index;
          topMessage = v.item.data;
        }
      }
      if (topMessage) {
        const label = formatChatDateSeparator(
          new Date(topMessage.createdAt),
          localeRef.current,
          dateLabelsRef.current
        );
        setStickyDateLabel(label);
      }
    },
    [markAsRead]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // In inverted list, contentOffset.y > 0 means scrolled away from newest
      const scrolled = e.nativeEvent.contentOffset.y > 40;
      if (scrolled !== isScrolledRef.current) {
        isScrolledRef.current = scrolled;
        Animated.timing(stickyOpacity, {
          toValue: scrolled ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [stickyOpacity]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const locale = useMemo(() => {
    const lang = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
    return isLocale(lang) ? lang : ("en" as const);
  }, []);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const dateLabels = useMemo(
    () => ({
      today: t("chat.dateToday"),
      yesterday: t("chat.dateYesterday"),
    }),
    [t]
  );
  const dateLabelsRef = useRef(dateLabels);
  dateLabelsRef.current = dateLabels;

  const chatListItems = useMemo(
    () => buildChatList(messages, dateLabels, locale),
    [messages, dateLabels, locale]
  );

  const renderItem: ListRenderItem<ChatListItem> = useCallback(
    ({ item }) => {
      if (item.kind === "date_separator") {
        return <ChatDateSeparator label={item.label} />;
      }
      return <ChatItem message={item.data} currentUserId={currentUserId} />;
    },
    [currentUserId]
  );

  const keyExtractor = useCallback((item: ChatListItem) => {
    if (item.kind === "date_separator") return `sep-${item.dateKey}`;
    if (item.data.tempId) return item.data.tempId;
    return `msg-${item.data.id}`;
  }, []);

  const ListFooterComponent = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <AppText variant="caption" color="secondary">
          {t("chat.loadingOlderMessages")}
        </AppText>
      </View>
    );
  }, [isFetchingNextPage, t]);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === "ios" ? insets.top + HEADER_HEIGHT : 0),
    [insets.top]
  );

  if (!groupId) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" color="secondary">
          {t("chat.invalidGroup")}
        </AppText>
      </View>
    );
  }

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingMessages")} />;
  }

  if (isError) {
    return (
      <QueryErrorView
        message={t("groups.failedLoadMessages")}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {messages.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <AppText variant="body" color="secondary" style={styles.emptyText}>
            {t("chat.noMessagesYet")}
          </AppText>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList<ChatListItem>
            data={chatListItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={ListFooterComponent}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
          />

          {/* Sticky date header overlay */}
          {stickyDateLabel && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.stickyHeader,
                { opacity: stickyOpacity },
              ]}
            >
              <View
                style={[
                  styles.stickyPill,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.textPrimary,
                  },
                ]}
              >
                <AppText variant="caption" color="secondary" style={styles.stickyText}>
                  {stickyDateLabel}
                </AppText>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      <ChatTypingIndicator
        typingUsers={typingUsers}
        currentUserId={currentUserId}
      />

      <ChatInput
        onSend={(body, mentions) => sendMessage(body, mentions)}
        onTypingStart={triggerTypingStart}
        onTypingStop={triggerTypingStop}
        readOnly={isEnded}
        memberOptions={memberOptions}
        fixtureOptions={fixtureOptions}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  stickyHeader: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  stickyPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  stickyText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingMore: {
    paddingVertical: 12,
    alignItems: "center",
  },
});
