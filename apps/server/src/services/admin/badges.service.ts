// src/services/admin/badges.service.ts
// Admin service for managing the global badge definitions catalog.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { getLogger } from "../../logger";
import { NotFoundError } from "../../utils/errors";
import type {
  AdminBadgeDefinitionItem,
  AdminBadgeDefinitionSearchItem,
} from "@repo/types";

const log = getLogger("AdminBadgeDefinitions");

function mapDefinitionToItem(
  def: {
    id: number;
    name: string;
    description: string;
    icon: string;
    criteriaType: string;
    criteriaValue: number;
    createdAt: Date;
    _count: { groupBadges: number };
  }
): AdminBadgeDefinitionItem {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    criteriaType: def.criteriaType,
    criteriaValue: def.criteriaValue,
    usageCount: def._count.groupBadges,
    createdAt: def.createdAt.toISOString(),
  };
}

export async function listBadgeDefinitions(
  page: number,
  perPage: number,
  filters?: { search?: string }
) {
  const where: Prisma.badgeDefinitionsWhereInput = {};

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  const [definitions, totalCount] = await Promise.all([
    prisma.badgeDefinitions.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: { select: { groupBadges: true } },
      },
    }),
    prisma.badgeDefinitions.count({ where }),
  ]);

  return {
    data: definitions.map(mapDefinitionToItem),
    pagination: {
      page,
      perPage,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / perPage) || 1,
    },
  };
}

export async function createBadgeDefinition(body: {
  name: string;
  description: string;
  icon: string;
  criteriaType: string;
  criteriaValue?: number;
}): Promise<AdminBadgeDefinitionItem> {
  const created = await prisma.badgeDefinitions.create({
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon,
      criteriaType: body.criteriaType,
      criteriaValue: body.criteriaValue ?? 1,
    },
    include: {
      _count: { select: { groupBadges: true } },
    },
  });

  log.info({ id: created.id }, "Badge definition created");
  return mapDefinitionToItem(created);
}

export async function updateBadgeDefinition(
  id: number,
  body: {
    name?: string;
    description?: string;
    icon?: string;
    criteriaType?: string;
    criteriaValue?: number;
  }
): Promise<AdminBadgeDefinitionItem> {
  const existing = await prisma.badgeDefinitions.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Badge definition not found");
  }

  const updateData: Prisma.badgeDefinitionsUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.criteriaType !== undefined) updateData.criteriaType = body.criteriaType;
  if (body.criteriaValue !== undefined) updateData.criteriaValue = body.criteriaValue;

  const updated = await prisma.badgeDefinitions.update({
    where: { id },
    data: updateData,
    include: {
      _count: { select: { groupBadges: true } },
    },
  });

  log.info({ id }, "Badge definition updated");
  return mapDefinitionToItem(updated);
}

export async function deleteBadgeDefinition(id: number): Promise<void> {
  const existing = await prisma.badgeDefinitions.findUnique({
    where: { id },
    include: { _count: { select: { groupBadges: true } } },
  });

  if (!existing) {
    throw new NotFoundError("Badge definition not found");
  }

  if (existing._count.groupBadges > 0) {
    throw new Error(
      `Cannot delete badge definition: it is used by ${existing._count.groupBadges} group(s). Remove it from all groups first.`
    );
  }

  await prisma.badgeDefinitions.delete({ where: { id } });
  log.info({ id }, "Badge definition deleted");
}

export async function searchBadgeDefinitions(
  query: string
): Promise<AdminBadgeDefinitionSearchItem[]> {
  const definitions = await prisma.badgeDefinitions.findMany({
    where: query
      ? { name: { contains: query, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      icon: true,
      description: true,
      criteriaType: true,
      criteriaValue: true,
    },
  });

  return definitions;
}
