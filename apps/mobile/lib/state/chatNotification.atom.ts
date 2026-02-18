// lib/state/chatNotification.atom.ts
// Jotai atom for in-app chat notification toast state.

import { atom } from "jotai";

export interface ChatNotification {
  groupId: number;
  groupName: string;
  senderId: number;
  senderName: string;
  senderImage: string | null;
  body: string;
}

/**
 * When set to a ChatNotification, the toast appears.
 * When set to null, the toast is hidden.
 */
export const chatNotificationAtom = atom<ChatNotification | null>(null);
