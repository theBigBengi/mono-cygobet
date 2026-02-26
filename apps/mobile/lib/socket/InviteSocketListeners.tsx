// lib/socket/InviteSocketListeners.tsx
// Subscribes to invite socket events and invalidates React Query cache.
// Shows an in-app toast when an invite is received.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useSocket } from "./SocketProvider";
import { invitesKeys } from "@/domains/invites/invites.keys";
import { groupsKeys } from "@/domains/groups/groups.keys";
import { chatNotificationAtom } from "@/lib/state/chatNotification.atom";
import type { InviteReceivedPayload } from "./socket.types";
import i18n from "i18next";

export function InviteSocketListeners() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const setNotification = useSetAtom(chatNotificationAtom);

  useEffect(() => {
    if (!socket) return;

    const onInviteReceived = (payload: InviteReceivedPayload) => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });

      const inviterName = payload.inviter.username ?? "Someone";
      const body =
        payload.message ??
        i18n.t("invites.inviteToGroup", {
          name: payload.groupName,
          ns: "common",
        });

      setNotification({
        groupId: payload.groupId,
        groupName: payload.groupName,
        senderId: payload.inviter.id,
        senderName: inviterName,
        senderImage: payload.inviter.image,
        body,
        type: "invite",
      });
    };

    const onInviteCancelled = () => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
    };

    const onInviteAccepted = (payload: {
      groupId?: number;
      userId: number;
      username: string | null;
    }) => {
      queryClient.invalidateQueries({ queryKey: invitesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groupsKeys.details() });
      if (payload.groupId) {
        queryClient.invalidateQueries({ queryKey: invitesKeys.sent(payload.groupId) });
        queryClient.invalidateQueries({ queryKey: groupsKeys.members(payload.groupId) });
      }
    };

    socket.on("invite:received", onInviteReceived);
    socket.on("invite:cancelled", onInviteCancelled);
    socket.on("invite:accepted", onInviteAccepted);

    return () => {
      socket.off("invite:received", onInviteReceived);
      socket.off("invite:cancelled", onInviteCancelled);
      socket.off("invite:accepted", onInviteAccepted);
    };
  }, [socket, queryClient, setNotification]);

  return null;
}
