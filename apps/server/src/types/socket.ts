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
}

export interface ServerToClientEvents {
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
  "typing:start": (data: {
    userId: number;
    username: string | null;
  }) => void;
  "typing:stop": (data: { userId: number }) => void;
  "error": (data: { event: string; message: string }) => void;
}

export interface SocketData {
  user: SocketUser;
}

export interface InterServerEvents {}

export type TypedIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
