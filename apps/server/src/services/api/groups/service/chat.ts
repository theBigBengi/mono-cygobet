import { prisma, type Prisma } from "@repo/db";
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
  if (!trimmed) throw new Error("Message body cannot be empty");
  if (trimmed.length > MAX_BODY) throw new Error(`Max ${MAX_BODY} characters`);

  // Block sends to ended groups
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { status: true },
  });
  if (group?.status === "ended") throw new Error("Group has ended");

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

  const reads = await prisma.groupMessageReads.findMany({
    where: { userId, groupId: { in: groupIds } },
  });
  const readMap = new Map(reads.map((r) => [r.groupId, r.lastReadMessageId]));

  const counts: Record<number, number> = {};
  await Promise.all(
    groupIds.map(async (gid) => {
      counts[gid] = await prisma.groupMessages.count({
        where: { groupId: gid, id: { gt: readMap.get(gid) ?? 0 } },
      });
    })
  );
  return counts;
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
      return `${data.homeTeam} ${data.homeScore ?? "?"}-${data.awayScore ?? "?"} ${data.awayTeam} — Full Time`;
    case "ranking_change":
      return `${data.username || "Someone"} moved to #${data.newPosition}`;
    case "leader_change":
      return `${data.username || "Someone"} is now leading!`;
    default:
      return `Event: ${eventType}`;
  }
}
