import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("push");
const expo = new Expo();

/**
 * Register a push token for a user. Upserts: if token already exists, updates userId.
 */
export async function registerPushToken(
  userId: number,
  token: string,
  platform: string
) {
  if (!Expo.isExpoPushToken(token)) {
    throw new Error("Invalid Expo push token");
  }

  await prisma.pushTokens.upsert({
    where: { token },
    update: { userId, platform },
    create: { userId, token, platform },
  });
}

/**
 * Remove a push token (e.g. on logout).
 */
export async function removePushToken(token: string) {
  await prisma.pushTokens.deleteMany({ where: { token } });
}

/**
 * Remove all push tokens for a user (e.g. on revoke-all).
 */
export async function removeAllPushTokens(userId: number) {
  await prisma.pushTokens.deleteMany({ where: { userId } });
}

/**
 * Send push notifications to specific users.
 * Silently handles errors - never throws.
 */
export async function sendPushToUsers(
  userIds: number[],
  notification: { title: string; body: string; data?: Record<string, unknown> }
) {
  if (!userIds.length) return;

  try {
    const tokens = await prisma.pushTokens.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    if (!tokens.length) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: "default" as const,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }));

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        // Clean up invalid tokens
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i]!;
          if (ticket.status === "error" && "details" in ticket) {
            const errorCode = ticket.details?.error;
            if (
              errorCode === "DeviceNotRegistered" ||
              errorCode === "InvalidCredentials"
            ) {
              const badToken = chunk[i]!.to as string;
              log.info({ token: badToken }, "Removing invalid push token");
              await prisma.pushTokens.deleteMany({
                where: { token: badToken },
              });
            }
          }
        }
      } catch (err) {
        log.warn({ err }, "Failed to send push notification chunk");
      }
    }
  } catch (err) {
    log.warn({ err, userIds }, "Failed to send push notifications");
  }
}

/**
 * Send push to all members of a group, excluding specified user IDs.
 */
export async function sendPushToGroupMembers(
  groupId: number,
  excludeUserIds: number[],
  notification: { title: string; body: string; data?: Record<string, unknown> }
) {
  try {
    const members = await prisma.groupMembers.findMany({
      where: {
        groupId,
        userId: { notIn: excludeUserIds },
      },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);
    await sendPushToUsers(userIds, notification);
  } catch (err) {
    log.warn({ err, groupId }, "Failed to send push to group members");
  }
}
