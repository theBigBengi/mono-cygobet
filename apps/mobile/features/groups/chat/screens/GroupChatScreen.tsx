// features/groups/chat/screens/GroupChatScreen.tsx
// Chat screen with inverted FlatList, KeyboardAvoidingView, auto markAsRead.

import React, { useCallback, useRef } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
} from "react-native";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useGroupChat, useGroupQuery } from "@/domains/groups";
import { useAuth } from "@/lib/auth/useAuth";
import { ChatMessageBubble } from "../components/ChatMessageBubble";
import { ChatSystemEvent } from "../components/ChatSystemEvent";
import { ChatInput } from "../components/ChatInput";
import { ChatTypingIndicator } from "../components/ChatTypingIndicator";
import { useMentionOptions } from "../hooks/useMentionOptions";
import type { FixtureItem } from "@/features/groups/group-lobby";
import type { ChatMessage } from "@/lib/socket";

interface GroupChatScreenProps {
  groupId: number | null;
}

function ChatItem({
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
}

export function GroupChatScreen({ groupId }: GroupChatScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const currentUserId = user?.id ?? 0;

  const { data: groupData } = useGroupQuery(groupId, {
    includeFixtures: true,
  });
  const isEnded = groupData?.data?.status === "ended";

  const fixtures: FixtureItem[] = Array.isArray(
    (groupData?.data as { fixtures?: FixtureItem[] })?.fixtures
  )
    ? ((groupData?.data as { fixtures: FixtureItem[] }).fixtures)
    : [];
  const { memberOptions, fixtureOptions } = useMentionOptions(groupId, fixtures);

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

  const lastMarkedRef = useRef<number>(0);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: ChatMessage }[] }) => {
      const newest = messages[0];
      if (!newest || newest.id <= 0) return;

      const isNewestVisible = viewableItems.some(
        (v) => v.item.id === newest.id || v.item.tempId
      );
      if (isNewestVisible && newest.id > lastMarkedRef.current) {
        lastMarkedRef.current = newest.id;
        markAsRead(newest.id);
      }
    },
    [messages, markAsRead]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => (
      <ChatItem message={item} currentUserId={currentUserId} />
    ),
    [currentUserId]
  );

  const keyExtractor = useCallback((item: ChatMessage) => {
    if (item.tempId) return item.tempId;
    return `msg-${item.id}`;
  }, []);

  const ListEmptyComponent = useCallback(() => {
    if (isLoading) return null;
    // Counteract FlatList inverted transform so empty state text reads normally
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyTextWrapper}>
          <AppText variant="body" color="secondary" style={styles.emptyText}>
            No messages yet. Start the conversation!
          </AppText>
        </View>
      </View>
    );
  }, [isLoading]);

  const ListFooterComponent = useCallback(() => {
    if (!hasNextPage || !isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <AppText variant="caption" color="secondary">
          Loading older messages...
        </AppText>
      </View>
    );
  }, [hasNextPage, isFetchingNextPage]);

  if (!groupId) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" color="secondary">
          Invalid group
        </AppText>
      </View>
    );
  }

  if (isLoading) {
    return <QueryLoadingView message="Loading messages..." />;
  }

  if (isError) {
    return (
      <QueryErrorView
        message="Failed to load messages"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
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
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={
          messages.length === 0 ? styles.emptyList : styles.listContent
        }
      />

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
  emptyList: {
    flex: 1,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTextWrapper: {
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
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
