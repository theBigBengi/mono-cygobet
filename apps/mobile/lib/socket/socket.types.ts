// Socket.IO event types — mirrors server/src/types/socket.ts

export interface MentionData {
  type: "user" | "fixture";
  id: number;
  display: string;
}

export interface ChatMessage {
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
  "message:new": (message: ChatMessage) => void;
  "typing:start": (data: { userId: number; username: string | null }) => void;
  "typing:stop": (data: { userId: number }) => void;
  error: (data: { event: string; message: string }) => void;
  "invite:received": (payload: InviteReceivedPayload) => void;
  "invite:cancelled": (payload: { inviteId: number }) => void;
  "invite:accepted": (payload: {
    groupId: number;
    userId: number;
    username: string | null;
  }) => void;
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
