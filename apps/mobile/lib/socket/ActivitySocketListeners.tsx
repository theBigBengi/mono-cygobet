// lib/socket/ActivitySocketListeners.tsx
// Subscribes to activity:new socket events and invalidates the unread
// activity counts cache. This replaces the 60s polling interval with
// near-instant, event-driven updates — queries only fire when there is
// actually new activity in a group.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./SocketProvider";
import { groupsKeys } from "@/domains/groups/groups.keys";
import type { ActivityPayload } from "./socket.types";

export function ActivitySocketListeners() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const onActivityNew = (_payload: ActivityPayload) => {
      // Invalidate the unread activity counts cache so the UI reflects
      // the new activity immediately instead of waiting for the next poll.
      queryClient.invalidateQueries({
        queryKey: groupsKeys.unreadActivityCounts(),
      });
    };

    socket.on("activity:new", onActivityNew);
    return () => {
      socket.off("activity:new", onActivityNew);
    };
  }, [socket, queryClient]);

  return null;
}
