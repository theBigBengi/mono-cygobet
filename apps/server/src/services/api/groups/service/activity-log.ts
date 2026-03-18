// groups/service/activity-log.ts
// Group activity log: write events and query paginated activity.

import { prisma, Prisma } from "@repo/db";
import { getLogger } from "../../../../logger";
import type { TypedIOServer } from "../../../../types/socket";

const log = getLogger("groups.activity-log");
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

/**
 * Write an event to the group activity log.
 * Fire-and-forget: never fails the caller.
 * Optionally broadcasts via Socket.IO.
 */
export async function logActivity(
  groupId: number,
  eventType: string,
  body: string,
  opts?: { actorId?: number; meta?: Record<string, unknown>; io?: TypedIOServer }
): Promise<void> {
  try {
    const row = await prisma.groupActivityLog.create({
      data: {
        groupId,
        actorId: opts?.actorId ?? null,
        eventType,
        body,
        meta: (opts?.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    opts?.io?.to(`group:${groupId}`).emit("activity:new", {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      eventType: row.eventType,
      body: row.body,
      meta: row.meta as Record<string, unknown> | null,
      actor: null,
    });
  } catch (err) {
    log.warn({ groupId, eventType, err }, "Failed to log activity");
  }
}

/**
 * Query paginated activity for a group.
 * Cursor-based pagination using `before` (ISO datetime).
 */
export async function getGroupActivity(
  groupId: number,
  opts?: { before?: string; limit?: number }
) {
  const limit = Math.min(opts?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const rows = await prisma.groupActivityLog.findMany({
    where: {
      groupId,
      ...(opts?.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      actor: { select: { id: true, username: true } },
    },
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    eventType: r.eventType,
    body: r.body,
    meta: r.meta as Record<string, unknown> | null,
    actor: r.actor ? { id: r.actor.id, username: r.actor.username } : null,
  }));

  return { items, hasMore };
}

/**
 * Mark activity as read for a user in a group.
 * Stores the latest activity ID they've seen.
 */
export async function markActivityAsRead(
  groupId: number,
  userId: number,
  lastReadActivityId: number
): Promise<void> {
  await prisma.groupMembers.updateMany({
    where: { groupId, userId, status: "joined" },
    data: { lastReadActivityId },
  });
}

/**
 * Get unread activity count for a user across all their groups.
 * Returns Record<groupId, count>.
 */
export async function getUnreadActivityCounts(
  userId: number,
  groupIds: number[]
): Promise<Record<number, number>> {
  if (!groupIds.length) return {};

  const rows = await prisma.$queryRaw<
    Array<{ group_id: number; cnt: bigint }>
  >`
    SELECT gal.group_id, COUNT(*) as cnt
    FROM group_activity_log gal
    JOIN group_members gm
      ON gm.group_id = gal.group_id AND gm.user_id = ${userId} AND gm.status = 'joined'
    WHERE gal.group_id IN (${Prisma.join(groupIds)})
      AND gal.id > COALESCE(gm.last_read_activity_id, 0)
      AND (gal.actor_id IS NULL OR gal.actor_id != ${userId})
    GROUP BY gal.group_id
  `;

  const counts: Record<number, number> = {};
  for (const gid of groupIds) counts[gid] = 0;
  for (const row of rows) counts[Number(row.group_id)] = Number(row.cnt);
  return counts;
}
