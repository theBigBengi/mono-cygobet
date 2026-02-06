/**
 * Chat preview types for group lobby.
 */

export interface LastMessageInfo {
  id: number;
  text: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    avatar: string | null;
  };
  /** Whether the current user has read this message */
  isRead: boolean;
}

export interface GroupChatPreviewResponse {
  status: "success" | "error";
  data: {
    [groupId: string]: {
      unreadCount: number;
      lastMessage: LastMessageInfo | null;
    };
  };
}
