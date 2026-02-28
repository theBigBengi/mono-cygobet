// src/services/admin/badges.service.ts
// Admin service for managing badges globally across all groups.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { getLogger } from "../../logger";
import { NotFoundError } from "../../utils/errors";
import type { AdminBadgeItem, AdminBadgeEarnedEntry } from "@repo/types";

const log = getLogger("AdminBadges");

function mapBadgeToItem(
  badge: {
    id: number;
    groupId: number;
    name: string;
    description: string;
    icon: string;
    criteriaType: string;
    criteriaValue: number;
    createdAt: Date;
    group: { name: string; status: string };
    _count: { earnedBadges: number };
  }
): AdminBadgeItem {
  return {
    id: badge.id,
    groupId: badge.groupId,
    groupName: badge.group.name,
    groupStatus: badge.group.status,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    criteriaType: badge.criteriaType,
    criteriaValue: badge.criteriaValue,
    earnedCount: badge._count.earnedBadges,
    createdAt: badge.createdAt.toISOString(),
  };
}

export async function listBadges(
  page: number,
  perPage: number,
  filters?: { search?: string; criteriaType?: string; groupId?: number }
) {
  const where: Prisma.groupBadgesWhereInput = {};

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.criteriaType) {
    where.criteriaType = filters.criteriaType;
  }
  if (filters?.groupId) {
    where.groupId = filters.groupId;
  }

  const [badges, totalCount] = await Promise.all([
    prisma.groupBadges.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        group: { select: { name: true, status: true } },
        _count: { select: { earnedBadges: true } },
      },
    }),
    prisma.groupBadges.count({ where }),
  ]);

  return {
    data: badges.map(mapBadgeToItem),
    pagination: {
      page,
      perPage,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / perPage) || 1,
    },
  };
}

export async function updateBadge(
  badgeId: number,
  body: {
    name?: string;
    description?: string;
    icon?: string;
    criteriaType?: string;
    criteriaValue?: number;
  }
): Promise<AdminBadgeItem> {
  const existing = await prisma.groupBadges.findUnique({
    where: { id: badgeId },
  });

  if (!existing) {
    throw new NotFoundError("Badge not found");
  }

  const updateData: Prisma.groupBadgesUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.criteriaType !== undefined) updateData.criteriaType = body.criteriaType;
  if (body.criteriaValue !== undefined) updateData.criteriaValue = body.criteriaValue;

  await prisma.groupBadges.update({
    where: { id: badgeId },
    data: updateData,
  });

  const updated = await prisma.groupBadges.findUniqueOrThrow({
    where: { id: badgeId },
    include: {
      group: { select: { name: true, status: true } },
      _count: { select: { earnedBadges: true } },
    },
  });

  log.info({ badgeId }, "Badge updated");
  return mapBadgeToItem(updated);
}

export async function listBadgeEarned(
  badgeId: number,
  page: number,
  perPage: number
) {
  const badge = await prisma.groupBadges.findUnique({
    where: { id: badgeId },
  });

  if (!badge) {
    throw new NotFoundError("Badge not found");
  }

  const where = { badgeId };

  const [entries, totalCount] = await Promise.all([
    prisma.userEarnedBadges.findMany({
      where,
      orderBy: { earnedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.userEarnedBadges.count({ where }),
  ]);

  const data: AdminBadgeEarnedEntry[] = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    userName: e.user.name,
    userEmail: e.user.email,
    earnedAt: e.earnedAt.toISOString(),
  }));

  return {
    data,
    pagination: {
      page,
      perPage,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / perPage) || 1,
    },
  };
}
