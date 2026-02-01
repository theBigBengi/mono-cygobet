import { prisma } from "@repo/db";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type ActivityFeedItem = {
  id: number;
  createdAt: string;
  groupId: number | null;
  groupName: string;
  eventType: string;
  body: string;
  meta: Record<string, unknown> | null;
  source: "group" | "user";
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

  let beforeDate: Date | undefined;
  if (opts.before) {
    const d = new Date(opts.before);
    if (Number.isNaN(d.getTime())) return { items: [], hasMore: false };
    beforeDate = d;
  }

  const memberships = await prisma.groupMembers.findMany({
    where: { userId, status: "joined" },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const [messages, userEvents] = await Promise.all([
    groupIds.length > 0
      ? prisma.groupMessages.findMany({
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
        })
      : [],
    prisma.userActivityEvents.findMany({
      where: {
        userId,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        groups: { select: { name: true } },
      },
    }),
  ]);

  const groupItems: ActivityFeedItem[] = (Array.isArray(messages) ? messages : []).map(
    (m) => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      groupId: m.groupId,
      groupName: m.groups.name,
      eventType:
        (m.meta as Record<string, unknown> | null)?.eventType as string ?? "unknown",
      body: m.body,
      meta: m.meta as Record<string, unknown> | null,
      source: "group" as const,
    })
  );

  type UserEventRow = (typeof userEvents)[number];
  const userItems: ActivityFeedItem[] = userEvents.map((e: UserEventRow) => {
    const meta = (e.meta as Record<string, unknown>) ?? {};
    return {
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      groupId: e.groupId ?? (meta.groupId as number | undefined) ?? null,
      groupName: (meta.groupName as string) ?? e.groups?.name ?? "",
      eventType: e.eventType,
      body: e.body,
      meta: meta as Record<string, unknown> | null,
      source: "user" as const,
    };
  });

  const merged = [...groupItems, ...userItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const hasMore = messages.length > limit || userEvents.length > limit;
  const items = merged.slice(0, limit);

  return { items, hasMore };
}
