// lib/socket/ChatNotificationListeners.tsx
// Global listener: joins all user's group rooms on socket connect,
// listens to message:new, and shows in-app toast notifications.
//
// Guardrails:
// 1. Skip messages from the current user
// 2. Skip if the user is viewing the same group
// 3. Throttle: max 1 toast per group every 30 seconds
// 4. Only show for user_message type

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useAtomValue } from "jotai";
import { useSocket } from "./SocketProvider";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import { groupsKeys } from "@/domains/groups/groups.keys";
import { activeGroupIdAtom } from "@/lib/state/activeGroup.atom";
import { chatNotificationAtom } from "@/lib/state/chatNotification.atom";
import type { ChatMessage } from "./socket.types";
import type { ApiGroupsResponse } from "@repo/types";

const THROTTLE_MS = 30_000;

export function ChatNotificationListeners() {
  const { socket, isConnected } = useSocket();
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const activeGroupId = useAtomValue(activeGroupIdAtom);
  const setNotification = useSetAtom(chatNotificationAtom);

  const activeGroupIdRef = useRef(activeGroupId);
  activeGroupIdRef.current = activeGroupId;

  const userIdRef = useRef(user?.id ?? 0);
  userIdRef.current = user?.id ?? 0;

  // Track which rooms we've joined to avoid re-joining
  const joinedRoomsRef = useRef<Set<number>>(new Set());

  // Throttle map: groupId -> last toast timestamp
  const throttleRef = useRef<Map<number, number>>(new Map());

  const isReady = isReadyForProtected(status, user);

  // Join all group rooms when socket connects or groups list changes
  useEffect(() => {
    if (!socket || !isConnected || !isReady) return;

    const groupsData = queryClient.getQueryData<ApiGroupsResponse>(
      groupsKeys.list()
    );
    const groups = groupsData?.data ?? [];

    const currentGroupIds = new Set(groups.map((g) => g.id));

    // Join new rooms
    for (const group of groups) {
      if (!joinedRoomsRef.current.has(group.id)) {
        socket.emit("group:join", group.id);
        joinedRoomsRef.current.add(group.id);
      }
    }

    // Leave rooms for groups we're no longer in
    for (const id of joinedRoomsRef.current) {
      if (!currentGroupIds.has(id)) {
        socket.emit("group:leave", id);
        joinedRoomsRef.current.delete(id);
      }
    }
  }, [socket, isConnected, isReady, queryClient]);

  // Re-join rooms when groups list is updated in cache
  useEffect(() => {
    if (!socket || !isConnected || !isReady) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.queryKey[0] === "groups" &&
        event.query.queryKey[1] === "list"
      ) {
        const groupsData = event.query.state.data as
          | ApiGroupsResponse
          | undefined;
        const groups = groupsData?.data ?? [];
        const currentGroupIds = new Set(groups.map((g) => g.id));

        for (const group of groups) {
          if (!joinedRoomsRef.current.has(group.id)) {
            socket.emit("group:join", group.id);
            joinedRoomsRef.current.add(group.id);
          }
        }

        for (const id of joinedRoomsRef.current) {
          if (!currentGroupIds.has(id)) {
            socket.emit("group:leave", id);
            joinedRoomsRef.current.delete(id);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [socket, isConnected, isReady, queryClient]);

  // Listen to message:new for toast notifications
  const handleMessageNew = useCallback(
    (message: ChatMessage) => {
      // 1. Skip system events
      if (message.type !== "user_message") return;

      // 2. Skip own messages
      if (message.senderId === userIdRef.current) return;

      // 3. Skip if user is viewing this group
      if (message.groupId === activeGroupIdRef.current) return;

      // 4. Throttle per group
      const now = Date.now();
      const lastShown = throttleRef.current.get(message.groupId) ?? 0;
      if (now - lastShown < THROTTLE_MS) return;
      throttleRef.current.set(message.groupId, now);

      // 5. Look up group name from React Query cache
      const groupsData = queryClient.getQueryData<ApiGroupsResponse>(
        groupsKeys.list()
      );
      const group = groupsData?.data?.find((g) => g.id === message.groupId);
      const groupName = group?.name ?? "Group";

      // 6. Show toast
      setNotification({
        groupId: message.groupId,
        groupName,
        senderId: message.senderId ?? 0,
        senderName: message.sender?.username ?? "Someone",
        senderImage: message.sender?.image ?? null,
        body: message.body,
      });
    },
    [queryClient, setNotification]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("message:new", handleMessageNew);
    return () => {
      socket.off("message:new", handleMessageNew);
    };
  }, [socket, handleMessageNew]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      joinedRoomsRef.current.clear();
      throttleRef.current.clear();
    };
  }, []);

  return null;
}
