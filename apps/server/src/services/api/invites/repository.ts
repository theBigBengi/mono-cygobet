// services/api/invites/repository.ts
// DB access for group invites.

import { prisma } from "@repo/db";

const INVITE_EXPIRY_DAYS = 7;

export function getInviteExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_EXPIRY_DAYS);
  return d;
}

export async function createInvite(data: {
  groupId: number;
  inviterId: number;
  inviteeId: number;
  message?: string | null;
}) {
  const expiresAt = getInviteExpiresAt();
  return prisma.groupInvites.create({
    data: {
      ...data,
      message: data.message ?? null,
      expiresAt,
    },
  });
}

export async function findPendingByGroupAndInvitee(
  groupId: number,
  inviteeId: number
) {
  return prisma.groupInvites.findFirst({
    where: {
      groupId,
      inviteeId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });
}

const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export async function countPendingTodayByInviter(
  inviterId: number
): Promise<number> {
  const since = startOfToday();
  return prisma.groupInvites.count({
    where: {
      inviterId,
      status: "pending",
      createdAt: { gte: since },
    },
  });
}

export async function getInviteById(id: number) {
  return prisma.groupInvites.findUnique({
    where: { id },
    include: {
      groups: { select: { id: true, name: true } },
    },
  });
}

export async function updateInviteStatus(
  id: number,
  status: "pending" | "accepted" | "declined" | "expired" | "cancelled",
  respondedAt?: Date
) {
  return prisma.groupInvites.update({
    where: { id },
    data: { status, respondedAt: respondedAt ?? new Date() },
  });
}

export async function listByInvitee(
  inviteeId: number,
  statusFilter:
    | "pending"
    | "accepted"
    | "declined"
    | "expired"
    | "cancelled"
    | undefined
) {
  const where: {
    inviteeId: number;
    status?: "pending" | "accepted" | "declined" | "expired" | "cancelled";
    expiresAt?: { gt: Date };
  } = { inviteeId };
  if (statusFilter) {
    where.status = statusFilter;
  }
  if (statusFilter === "pending") {
    where.expiresAt = { gt: new Date() };
  }
  return prisma.groupInvites.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      groups: { select: { id: true, name: true } },
    },
  });
}

export async function deleteInvite(id: number) {
  return prisma.groupInvites.delete({ where: { id } });
}

const DECLINE_COOLDOWN_HOURS = 24;

/**
 * Check if there was a declined invite within the cooldown period.
 * Returns true if cooldown is active (cannot send new invite).
 */
export async function isDeclineCooldownActive(
  groupId: number,
  inviteeId: number
): Promise<boolean> {
  const cooldownStart = new Date();
  cooldownStart.setHours(cooldownStart.getHours() - DECLINE_COOLDOWN_HOURS);

  const recentDecline = await prisma.groupInvites.findFirst({
    where: {
      groupId,
      inviteeId,
      status: "declined",
      respondedAt: { gte: cooldownStart },
    },
  });

  return recentDecline !== null;
}
