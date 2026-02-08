// features/groups/chat/screens/GroupChatScreen.tsx
// Chat screen with inverted FlatList, KeyboardAvoidingView, auto markAsRead.

import React, { useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
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
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { ChatSystemEvent } from "../components/ChatSystemEvent";
import { ChatInput } from "../components/ChatInput";
import { ChatTypingIndicator } from "../components/ChatTypingIndicator";
import { useMentionOptions } from "../hooks/useMentionOptions";
import { HEADER_HEIGHT } from "@/features/groups/predictions/utils/constants";
import type { FixtureItem } from "@/types/common";
import type { ChatMessage } from "@/lib/socket";

interface GroupChatScreenProps {
  groupId: number | null;
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

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: ChatMessage }[] }) => {
      const currentMessages = messagesRef.current;
      const newest = currentMessages[0];
      if (!newest || newest.id <= 0) return;

      const isNewestVisible = viewableItems.some(
        (v) => v.item.id === newest.id || v.item.tempId
      );
      if (isNewestVisible && newest.id > lastMarkedRef.current) {
        lastMarkedRef.current = newest.id;
        markAsRead(newest.id);
      }
    },
    [markAsRead]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => <ChatItem message={item} currentUserId={currentUserId} />,
    [currentUserId]
  );

  const keyExtractor = useCallback((item: ChatMessage) => {
    if (item.tempId) return item.tempId;
    return `msg-${item.id}`;
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
        <FlatList
          data={messages}
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
          contentContainerStyle={styles.listContent}
        />
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
  listContent: {
    paddingVertical: 12,
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
