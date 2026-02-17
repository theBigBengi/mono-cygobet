// lib/socket/InviteSocketListeners.tsx
// Subscribes to invite socket events and invalidates React Query cache.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "./SocketProvider";
import { invitesKeys } from "@/domains/invites/invites.keys";
import { groupsKeys } from "@/domains/groups/groups.keys";

export function InviteSocketListeners() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const onInviteReceived = () => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
    };

    const onInviteCancelled = () => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
    };

    const onInviteAccepted = (payload: {
      userId: number;
      username: string | null;
    }) => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupsKeys.details() });
    };

    socket.on("invite:received", onInviteReceived);
    socket.on("invite:cancelled", onInviteCancelled);
    socket.on("invite:accepted", onInviteAccepted);

    return () => {
      socket.off("invite:received", onInviteReceived);
      socket.off("invite:cancelled", onInviteCancelled);
      socket.off("invite:accepted", onInviteAccepted);
    };
  }, [socket, queryClient]);

  return null;
}
