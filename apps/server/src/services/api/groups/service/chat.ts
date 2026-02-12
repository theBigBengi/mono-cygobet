import { prisma, Prisma } from "@repo/db";
import type { LastMessageInfo } from "@repo/types";
import { BadRequestError } from "../../../../utils/errors";
import { assertGroupMember } from "../permissions";
import { getLogger } from "../../../../logger";
import type { MentionData } from "../../../../types/socket";

const log = getLogger("groups.chat");
const MAX_BODY = 2000;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export async function sendMessage(
  groupId: number,
  senderId: number,
  body: string,
  mentions?: MentionData[]
) {
  await assertGroupMember(groupId, senderId);

  const trimmed = body.trim();
  if (!trimmed) throw new BadRequestError("Message body cannot be empty");
  if (trimmed.length > MAX_BODY)
    throw new BadRequestError(`Max ${MAX_BODY} characters`);

  // Block sends to ended groups
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { status: true },
  });
  if (group?.status === "ended") throw new BadRequestError("Group has ended");

  const meta = mentions?.length
    ? ({ mentions } as unknown as Prisma.InputJsonValue)
    : undefined;

  return prisma.groupMessages.create({
    data: { groupId, senderId, type: "user_message", body: trimmed, meta },
  });
}

export async function createSystemMessage(
  groupId: number,
  eventType: string,
  eventData: Record<string, unknown>
) {
  const body = buildEventBody(eventType, eventData);
  return prisma.groupMessages.create({
    data: {
      groupId,
      senderId: null,
      type: "system_event",
      body,
      meta: { eventType, ...eventData },
    },
  });
}

export async function getMessages(
  groupId: number,
  userId: number,
  opts: { before?: number; limit?: number } = {}
) {
  await assertGroupMember(groupId, userId);
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const messages = await prisma.groupMessages.findMany({
    where: {
      groupId,
      ...(opts.before ? { id: { lt: opts.before } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
    include: {
      sender: { select: { id: true, username: true, image: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    createdAt: m.createdAt.toISOString(),
    groupId: m.groupId,
    senderId: m.senderId,
    type: m.type,
    body: m.body,
    meta: m.meta as Record<string, unknown> | null,
    sender: m.sender
      ? { id: m.sender.id, username: m.sender.username, image: m.sender.image }
      : null,
  }));
}

export async function markAsRead(
  groupId: number,
  userId: number,
  lastReadMessageId: number
) {
  await assertGroupMember(groupId, userId);

  const existing = await prisma.groupMessageReads.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (existing) {
    if (lastReadMessageId > existing.lastReadMessageId) {
      await prisma.groupMessageReads.update({
        where: { id: existing.id },
        data: { lastReadMessageId },
      });
    }
  } else {
    await prisma.groupMessageReads.create({
      data: { groupId, userId, lastReadMessageId },
    });
  }
}

export async function getUnreadCounts(
  userId: number,
  groupIds: number[]
): Promise<Record<number, number>> {
  if (!groupIds.length) return {};

  const rows = await prisma.$queryRaw<Array<{ group_id: number; cnt: bigint }>>`
    SELECT gm.group_id, COUNT(*) as cnt
    FROM group_messages gm
    LEFT JOIN group_message_reads gmr
      ON gmr.group_id = gm.group_id AND gmr.user_id = ${userId}
    WHERE gm.group_id IN (${Prisma.join(groupIds)})
      AND gm.id > COALESCE(gmr.last_read_message_id, 0)
      AND gm.type = 'user_message'
    GROUP BY gm.group_id
  `;

  const counts: Record<number, number> = {};
  for (const gid of groupIds) counts[gid] = 0;
  for (const row of rows) counts[Number(row.group_id)] = Number(row.cnt);
  return counts;
}

export async function getGroupsChatPreview(
  userId: number,
  groupIds: number[]
): Promise<
  Record<string, { unreadCount: number; lastMessage: LastMessageInfo | null }>
> {
  if (!groupIds.length) return {};

  // 1. Get unread counts (already batched)
  const unreadCounts = await getUnreadCounts(userId, groupIds);

  // 2. Get last user message per group in one query (DISTINCT ON)
  const lastMessagesRaw = await prisma.$queryRaw<
    Array<{
      group_id: number;
      id: number;
      body: string;
      created_at: Date;
      sender_id: number;
      sender_username: string | null;
      sender_image: string | null;
    }>
  >`
    SELECT DISTINCT ON (gm.group_id)
      gm.group_id,
      gm.id,
      gm.body,
      gm.created_at,
      gm.sender_id,
      u.username as sender_username,
      u.image as sender_image
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.group_id IN (${Prisma.join(groupIds)})
      AND gm.sender_id IS NOT NULL
    ORDER BY gm.group_id, gm.created_at DESC
  `;

  // 3. Get read records in one query
  const readRecords = await prisma.groupMessageReads.findMany({
    where: {
      userId,
      groupId: { in: groupIds },
    },
  });
  const readMap = new Map(
    readRecords.map((r) => [r.groupId, r.lastReadMessageId])
  );

  // 4. Build result (one row per group from raw; fill missing groups with null lastMessage)
  const lastMessagesByGroup = new Map(
    lastMessagesRaw.map((m) => [m.group_id, m])
  );
  const result: Record<
    string,
    { unreadCount: number; lastMessage: LastMessageInfo | null }
  > = {};

  for (const groupId of groupIds) {
    const unreadCount = unreadCounts[groupId] ?? 0;
    const msg = lastMessagesByGroup.get(groupId);

    if (!msg) {
      result[String(groupId)] = { unreadCount, lastMessage: null };
      continue;
    }

    const lastReadMessageId = readMap.get(groupId) ?? 0;
    const isRead = lastReadMessageId >= msg.id;

    result[String(groupId)] = {
      unreadCount,
      lastMessage: {
        id: msg.id,
        text: msg.body,
        createdAt: msg.created_at.toISOString(),
        sender: {
          id: msg.sender_id,
          username: msg.sender_username || `User ${msg.sender_id}`,
          avatar: msg.sender_image,
        },
        isRead,
      },
    };
  }

  return result;
}

function buildEventBody(
  eventType: string,
  data: Record<string, unknown>
): string {
  switch (eventType) {
    case "member_joined":
      return `${data.username || "Someone"} joined the group`;
    case "member_left":
      return `${data.username || "Someone"} left the group`;
    case "fixture_live":
      return `${data.homeTeam || "?"} vs ${data.awayTeam || "?"} — Kicked off!`;
    case "fixture_ft":
      return `${data.homeTeam} ${data.homeScore90 ?? "?"}-${data.awayScore90 ?? "?"} ${data.awayTeam} — Full Time`;
    case "ranking_change":
      return `${data.username || "Someone"} moved to #${data.newPosition}`;
    case "leader_change":
      return `${data.username || "Someone"} is now leading!`;
    default:
      return `Event: ${eventType}`;
  }
}
