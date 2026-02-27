// src/services/admin/official-groups.service.ts
// Admin service for managing official groups and their badges.

import { prisma, groupPrivacy } from "@repo/db";
import type { Prisma } from "@repo/db";
import { getLogger } from "../../logger";
import { NotFoundError, BadRequestError } from "../../utils/errors";
import { OFFICIAL_MAX_MEMBERS, GROUP_STATUS } from "../api/groups/constants";
import { repository as repo } from "../api/groups/repository";
import { nowUnixSeconds } from "../../utils/dates";
import type {
  AdminOfficialGroupItem,
  AdminCreateOfficialGroupBody,
  AdminUpdateOfficialGroupBody,
} from "@repo/types";

const log = getLogger("AdminOfficialGroups");

function mapGroupToItem(
  group: {
    id: number;
    name: string;
    description: string | null;
    status: string;
    createdAt: Date;
  },
  memberCount: number,
  fixtureCount: number,
  badge: {
    id: number;
    name: string;
    description: string;
    icon: string;
    criteriaType: string;
    criteriaValue: number;
  } | null
): AdminOfficialGroupItem {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    status: group.status as "draft" | "active" | "ended",
    memberCount,
    fixtureCount,
    createdAt: group.createdAt.toISOString(),
    badge,
  };
}

export async function listOfficialGroups(
  page: number,
  perPage: number
): Promise<{
  data: AdminOfficialGroupItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}> {
  const where: Prisma.groupsWhereInput = { isOfficial: true };

  const [groups, totalCount] = await Promise.all([
    prisma.groups.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        groupBadge: true,
        _count: {
          select: {
            groupMembers: { where: { status: "joined" } },
            groupFixtures: true,
          },
        },
      },
    }),
    prisma.groups.count({ where }),
  ]);

  const data: AdminOfficialGroupItem[] = groups.map((g) =>
    mapGroupToItem(
      g,
      g._count.groupMembers,
      g._count.groupFixtures,
      g.groupBadge
        ? {
            id: g.groupBadge.id,
            name: g.groupBadge.name,
            description: g.groupBadge.description,
            icon: g.groupBadge.icon,
            criteriaType: g.groupBadge.criteriaType,
            criteriaValue: g.groupBadge.criteriaValue,
          }
        : null
    )
  );

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

export async function createOfficialGroup(
  body: AdminCreateOfficialGroupBody,
  adminUserId: number
): Promise<AdminOfficialGroupItem> {
  const now = nowUnixSeconds();

  // 1. Create the group as draft
  const group = await repo.createGroupWithMemberAndRules({
    name: body.name,
    creatorId: adminUserId,
    privacy: groupPrivacy.public,
    selectionMode: body.selectionMode,
    fixtureIds: body.fixtureIds ?? [],
    teamIds: body.teamIds ?? [],
    leagueIds: body.leagueIds ?? [],
    now,
    inviteAccess: "all",
    description: body.description ?? null,
  });

  // 2. Mark as official + publish immediately
  const published = await repo.publishGroupInternal({
    groupId: group.id,
    status: GROUP_STATUS.ACTIVE as typeof GROUP_STATUS.ACTIVE,
    maxMembers: OFFICIAL_MAX_MEMBERS,
    onTheNosePoints: body.onTheNosePoints,
    correctDifferencePoints: body.correctDifferencePoints,
    outcomePoints: body.outcomePoints,
    predictionMode: body.predictionMode as any,
    koRoundMode: body.koRoundMode as any,
  });

  // 3. Set isOfficial flag
  await prisma.groups.update({
    where: { id: group.id },
    data: { isOfficial: true },
  });

  // 4. Create badge if provided
  let badge: AdminOfficialGroupItem["badge"] = null;
  if (body.badge) {
    const created = await prisma.groupBadges.create({
      data: {
        groupId: group.id,
        name: body.badge.name,
        description: body.badge.description,
        icon: body.badge.icon,
        criteriaType: body.badge.criteriaType,
        criteriaValue: body.badge.criteriaValue ?? 1,
      },
    });
    badge = {
      id: created.id,
      name: created.name,
      description: created.description,
      icon: created.icon,
      criteriaType: created.criteriaType,
      criteriaValue: created.criteriaValue,
    };
  }

  // Count fixtures
  const fixtureCount = await prisma.groupFixtures.count({
    where: { groupId: group.id },
  });

  log.info({ groupId: group.id }, "Official group created");

  return mapGroupToItem(
    { ...published, description: body.description ?? null },
    1, // admin is the first member
    fixtureCount,
    badge
  );
}

export async function getOfficialGroup(
  groupId: number
): Promise<AdminOfficialGroupItem> {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    include: {
      groupBadge: true,
      _count: {
        select: {
          groupMembers: { where: { status: "joined" } },
          groupFixtures: true,
        },
      },
    },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  return mapGroupToItem(
    group,
    group._count.groupMembers,
    group._count.groupFixtures,
    group.groupBadge
      ? {
          id: group.groupBadge.id,
          name: group.groupBadge.name,
          description: group.groupBadge.description,
          icon: group.groupBadge.icon,
          criteriaType: group.groupBadge.criteriaType,
          criteriaValue: group.groupBadge.criteriaValue,
        }
      : null
  );
}

export async function updateOfficialGroup(
  groupId: number,
  body: AdminUpdateOfficialGroupBody
): Promise<AdminOfficialGroupItem> {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  // Update group fields
  const updateData: Prisma.groupsUpdateInput = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;

  if (Object.keys(updateData).length > 0) {
    await prisma.groups.update({
      where: { id: groupId },
      data: updateData,
    });
  }

  // Update or create/delete badge
  if (body.badge !== undefined) {
    if (body.badge === null) {
      // Delete badge
      await prisma.groupBadges.deleteMany({ where: { groupId } });
    } else {
      await prisma.groupBadges.upsert({
        where: { groupId },
        create: {
          groupId,
          name: body.badge.name,
          description: body.badge.description,
          icon: body.badge.icon,
          criteriaType: body.badge.criteriaType,
          criteriaValue: body.badge.criteriaValue ?? 1,
        },
        update: {
          name: body.badge.name,
          description: body.badge.description,
          icon: body.badge.icon,
          criteriaType: body.badge.criteriaType,
          criteriaValue: body.badge.criteriaValue ?? 1,
        },
      });
    }
  }

  log.info({ groupId }, "Official group updated");
  return getOfficialGroup(groupId);
}

export async function deleteOfficialGroup(groupId: number): Promise<void> {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  await prisma.groups.delete({ where: { id: groupId } });
  log.info({ groupId }, "Official group deleted");
}
