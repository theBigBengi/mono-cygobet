import { prisma } from "@repo/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ActivityFeedItem = {
  id: number;
  createdAt: string;
  groupId: number;
  groupName: string;
  eventType: string;
  body: string;
  meta: Record<string, unknown> | null;
};

export type GetActivityFeedOpts = {
  before?: string;
  limit?: number;
};

export async function getActivityFeed(
  userId: number,
  opts: GetActivityFeedOpts = {}
): Promise<{ items: ActivityFeedItem[]; hasMore: boolean }> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const take = limit + 1;

  const memberships = await prisma.groupMembers.findMany({
    where: { userId, status: "joined" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) {
    return { items: [], hasMore: false };
  }

  let beforeDate: Date | undefined;
  if (opts.before) {
    const d = new Date(opts.before);
    if (Number.isNaN(d.getTime())) return { items: [], hasMore: false };
    beforeDate = d;
  }

  const messages = await prisma.groupMessages.findMany({
    where: {
      type: "system_event",
      groupId: { in: groupIds },
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      groups: { select: { name: true } },
    },
  });

  const hasMore = messages.length > limit;
  const items = (hasMore ? messages.slice(0, limit) : messages).map((m) => ({
    id: m.id,
    createdAt: m.createdAt.toISOString(),
    groupId: m.groupId,
    groupName: m.groups.name,
    eventType: (m.meta as Record<string, unknown> | null)?.eventType as string ?? "unknown",
    body: m.body,
    meta: m.meta as Record<string, unknown> | null,
  }));

  return { items, hasMore };
}
