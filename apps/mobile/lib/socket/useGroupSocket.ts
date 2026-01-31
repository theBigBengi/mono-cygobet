import { useEffect, useRef } from "react";
import { useSocket } from "./SocketProvider";

/**
 * Join a group's Socket.IO room on mount, leave on unmount.
 * Returns the socket and connection status.
 *
 * Usage: call this in any screen that needs real-time events for a group.
 */
export function useGroupSocket(groupId: number | null) {
  const { socket, isConnected } = useSocket();
  const joinedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !groupId) return;

    // Join the room
    socket.emit("group:join", groupId);
    joinedRef.current = groupId;

    return () => {
      // Leave the room on unmount or groupId change
      if (joinedRef.current !== null) {
        socket.emit("group:leave", joinedRef.current);
        joinedRef.current = null;
      }
    };
  }, [socket, isConnected, groupId]);

  return { socket, isConnected };
}
