import { useEffect } from "react";
import { useSocket } from "./SocketProvider";

/**
 * Returns the socket and connection status for a group.
 *
 * NOTE: Room management (group:join/leave) is handled globally by
 * ChatNotificationListeners. This hook no longer joins/leaves rooms
 * to avoid conflicting with the global listener.
 *
 * It still emits group:join as a safety net in case the global listener
 * hasn't joined yet (e.g., race condition on first load).
 */
export function useGroupSocket(groupId: number | null) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !groupId) return;

    // Safety join — no-op on server if already in room
    socket.emit("group:join", groupId);

    // No group:leave on unmount — global listener manages room lifecycle
  }, [socket, isConnected, groupId]);

  return { socket, isConnected };
}
