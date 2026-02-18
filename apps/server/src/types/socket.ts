import type { Server as SocketIOServer } from "socket.io";

export interface SocketUser {
  id: number;
  username: string | null;
  name: string | null;
  image: string | null;
}

export interface MentionData {
  type: "user" | "fixture";
  id: number;
  display: string;
}

export interface ClientToServerEvents {
  "group:join": (groupId: number) => void;
  "group:leave": (groupId: number) => void;
  "message:send": (data: {
    groupId: number;
    body: string;
    mentions?: MentionData[];
    tempId?: string;
  }) => void;
  "typing:start": (groupId: number) => void;
  "typing:stop": (groupId: number) => void;
  "messages:read": (data: {
    groupId: number;
    lastReadMessageId: number;
  }) => void;
  // Admin namespace events
  "admin:join": () => void;
}

export interface InviteReceivedPayload {
  inviteId: number;
  groupId: number;
  groupName: string;
  inviter: { id: number; username: string | null; image: string | null };
  message: string | null;
  expiresAt: string;
}

export interface ServerToClientEvents {
  "invite:received": (payload: InviteReceivedPayload) => void;
  "invite:cancelled": (payload: { inviteId: number }) => void;
  "invite:accepted": (payload: {
    groupId: number;
    userId: number;
    username: string | null;
  }) => void;
  "message:new": (message: {
    id: number;
    createdAt: string;
    groupId: number;
    senderId: number | null;
    type: "user_message" | "system_event";
    body: string;
    meta: Record<string, unknown> | null;
    sender: {
      id: number;
      username: string | null;
      image: string | null;
    } | null;
    tempId?: string;
  }) => void;
  "typing:start": (data: { userId: number; username: string | null }) => void;
  "typing:stop": (data: { userId: number }) => void;
  error: (data: { event: string; message: string }) => void;
  // Admin alert events (sent to "admin" room)
  "alert:new": (alert: unknown) => void;
  "alert:resolved": (data: { count: number }) => void;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  name: string | null;
}

export interface SocketData {
  user: SocketUser;
  adminUser?: AdminUser;
}

export interface InterServerEvents {}

export type TypedIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
