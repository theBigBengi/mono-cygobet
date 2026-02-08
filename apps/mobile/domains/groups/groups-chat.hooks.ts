import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useAppIsActive } from "@/lib/hooks/useAppIsActive";
import { isReadyForProtected } from "@/lib/auth/guards";
import type { ChatMessage, MentionData } from "@/lib/socket";
import { useGroupSocket } from "@/lib/socket";
import {
  fetchGroupMessages,
  fetchUnreadCounts,
  fetchGroupChatPreview,
  markMessagesAsRead,
} from "./groups-chat.api";
import { groupsKeys } from "./groups.keys";
import type { ApiError } from "@/lib/http/apiError";
import type { LastMessageInfo } from "@repo/types";

let messageCounter = 0;

const MESSAGES_PAGE_SIZE = 30;
const TYPING_INDICATOR_TIMEOUT_MS = 5000;

/**
 * Fetch messages for a group with cursor-based pagination.
 * - 30 messages per page, cursor = oldest (smallest) message ID.
 */
export function useGroupMessagesQuery(groupId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    groupId !== null &&
    !Number.isNaN(groupId);

  return useInfiniteQuery({
    queryKey: groupsKeys.messages(groupId ?? 0),
    queryFn: async ({ pageParam }) => {
      const res = await fetchGroupMessages(groupId!, {
        before: pageParam,
        limit: MESSAGES_PAGE_SIZE,
      });
      return res;
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      const msgs = lastPage.data;
      if (msgs.length < MESSAGES_PAGE_SIZE) return undefined;
      const oldestId = Math.min(
        ...msgs.map((m) => m.id).filter((id) => id > 0)
      );
      return Number.isFinite(oldestId) ? oldestId : undefined;
    },
    enabled,
    meta: { scope: "user" } as const,
  });
}

/**
 * Fetch unread message counts for all of the user's joined groups.
 */
export function useUnreadCountsQuery() {
  const { status, user } = useAuth();
  const isActive = useAppIsActive();

  const enabled = isReadyForProtected(status, user);

  return useQuery<{ data: Record<string, number> }, ApiError>({
    queryKey: groupsKeys.unreadCounts(),
    queryFn: () => fetchUnreadCounts(),
    enabled,
    refetchInterval: isActive ? 30_000 : false, // Pause when in background
    meta: { scope: "user" } as const,
  });
}

/**
 * Fetch chat preview (unread count + last message) for all of the user's joined groups.
 */
export function useGroupChatPreviewQuery() {
  const { status, user } = useAuth();
  const isActive = useAppIsActive();

  const enabled = isReadyForProtected(status, user);

  return useQuery({
    queryKey: groupsKeys.chatPreview(),
    queryFn: () => fetchGroupChatPreview(),
    enabled,
    staleTime: 30_000, // 30 seconds
    refetchInterval: isActive ? 60_000 : false, // Pause when in background
    meta: { scope: "user" } as const,
  });
}

type TypingUser = { userId: number; username: string | null };

/**
 * Central chat hook — connects Socket.IO, React Query, and typing indicators.
 * - Listens to message:new and injects into React Query cache.
 * - Optimistic send with negative tempId, replaced when server echo arrives.
 * - Typing indicators with 5-second auto-clear.
 * - markAsRead via Socket.IO + optimistic unread count update.
 */
export function useGroupChat(groupId: number | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket, isConnected } = useGroupSocket(groupId);
  const messagesQuery = useGroupMessagesQuery(groupId);

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Flatten pages into a single messages array (newest first)
  const messages: ChatMessage[] =
    messagesQuery.data?.pages.flatMap((p) => p.data) ?? [];

  const fetchNextPage = messagesQuery.fetchNextPage;

  // Listen to message:new and inject into cache
  useEffect(() => {
    if (!socket || !groupId) return;

    const handleMessageNew = (message: ChatMessage) => {
      const key = groupsKeys.messages(groupId);

      queryClient.setQueryData(
        key,
        (
          old:
            | { pages: { data: ChatMessage[] }[]; pageParams: unknown[] }
            | undefined
        ) => {
          if (!old) {
            return {
              pages: [{ data: [message] }],
              pageParams: [undefined],
            };
          }

          // If we have tempId, replace optimistic message
          const hasTempId = message.tempId != null;
          const firstPage = old.pages[0];
          const existingData = firstPage?.data ?? [];

          let newData = [...existingData];

          if (hasTempId) {
            const idx = newData.findIndex((m) => m.tempId === message.tempId);
            if (idx >= 0) {
              const { tempId: _, ...rest } = message;
              newData[idx] = { ...rest, tempId: undefined };
            } else {
              const { tempId: _, ...rest } = message;
              newData = [{ ...rest, tempId: undefined }, ...newData];
            }
          } else {
            // Check if message already exists (avoid duplicates)
            const exists = newData.some((m) => m.id === message.id);
            if (!exists) {
              newData = [message, ...newData];
            }
          }

          return {
            ...old,
            pages: [{ data: newData }, ...old.pages.slice(1)],
            pageParams: old.pageParams,
          };
        }
      );
    };

    socket.on("message:new", handleMessageNew);
    return () => {
      socket.off("message:new", handleMessageNew);
    };
  }, [socket, groupId, queryClient]);

  // Typing indicators
  useEffect(() => {
    if (!socket || !groupId) return;

    const handleTypingStart = (data: {
      userId: number;
      username: string | null;
    }) => {
      setTypingUsers((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, { userId: data.userId, username: data.username }];
      });

      // Auto-clear after 5 seconds
      const existing = typingTimeoutsRef.current.get(data.userId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        typingTimeoutsRef.current.delete(data.userId);
      }, TYPING_INDICATOR_TIMEOUT_MS);
      typingTimeoutsRef.current.set(data.userId, t);
    };

    const handleTypingStop = (data: { userId: number }) => {
      const existing = typingTimeoutsRef.current.get(data.userId);
      if (existing) {
        clearTimeout(existing);
        typingTimeoutsRef.current.delete(data.userId);
      }
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    };

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    return () => {
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
    };
  }, [socket, groupId]);

  const sendMessage = useCallback(
    (body: string, mentions?: MentionData[]) => {
      if (!socket || !groupId || !user) return;

      messageCounter += 1;
      const tempId = `temp-${Date.now()}-${messageCounter}`;
      const optimisticMessage: ChatMessage = {
        id: -(Date.now() + messageCounter),
        createdAt: new Date().toISOString(),
        groupId,
        senderId: user.id,
        type: "user_message",
        body,
        meta: mentions?.length ? { mentions } : null,
        sender: {
          id: user.id,
          username: user.username ?? null,
          image: user.image ?? null,
        },
        tempId,
      };

      // Optimistic update
      const key = groupsKeys.messages(groupId);
      queryClient.setQueryData(
        key,
        (
          old:
            | { pages: { data: ChatMessage[] }[]; pageParams: unknown[] }
            | undefined
        ) => {
          if (!old) {
            return {
              pages: [{ data: [optimisticMessage] }],
              pageParams: [undefined],
            };
          }
          const firstPage = old.pages[0];
          const existingData = firstPage?.data ?? [];
          const newData = [optimisticMessage, ...existingData];
          return {
            ...old,
            pages: [{ data: newData }, ...old.pages.slice(1)],
            pageParams: old.pageParams,
          };
        }
      );

      socket.emit("message:send", {
        groupId,
        body,
        mentions,
        tempId,
      });
    },
    [socket, groupId, user, queryClient]
  );

  const markAsRead = useCallback(
    async (lastReadMessageId: number) => {
      if (!groupId) return;

      // 1. Optimistic update for unread counts (existing)
      queryClient.setQueryData(
        groupsKeys.unreadCounts(),
        (old: { data: Record<string, number> } | undefined) => {
          if (!old) return old;
          const next = { ...old.data };
          delete next[String(groupId)];
          return { data: next };
        }
      );

      // 2. Optimistic update for chat preview
      queryClient.setQueryData(
        groupsKeys.chatPreview(),
        (
          old:
            | {
                status: string;
                data: Record<
                  string,
                  { unreadCount: number; lastMessage: LastMessageInfo | null }
                >;
              }
            | undefined
        ) => {
          if (!old?.data?.[String(groupId)]) return old;
          const currentPreview = old.data[String(groupId)];
          return {
            ...old,
            data: {
              ...old.data,
              [String(groupId)]: {
                unreadCount: 0,
                lastMessage: currentPreview.lastMessage
                  ? { ...currentPreview.lastMessage, isRead: true }
                  : null,
              },
            },
          };
        }
      );

      // 3. Reliable HTTP call (persists to DB)
      try {
        await markMessagesAsRead(groupId, lastReadMessageId);
      } catch {
        // Revert optimistic updates on failure
        queryClient.invalidateQueries({ queryKey: groupsKeys.unreadCounts() });
        queryClient.invalidateQueries({ queryKey: groupsKeys.chatPreview() });
      }
    },
    [groupId, queryClient]
  );

  const triggerTypingStart = useCallback(() => {
    if (socket && groupId) {
      socket.emit("typing:start", groupId);
    }
  }, [socket, groupId]);

  const triggerTypingStop = useCallback(() => {
    if (socket && groupId) {
      socket.emit("typing:stop", groupId);
    }
  }, [socket, groupId]);

  return {
    messages,
    sendMessage,
    typingUsers,
    triggerTypingStart,
    triggerTypingStop,
    markAsRead,
    fetchNextPage,
    refetch: messagesQuery.refetch,
    isConnected,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
  };
}
