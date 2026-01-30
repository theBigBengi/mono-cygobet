// groups/repository/core.ts
// Core repository functions for groups.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { groupPrivacy, groupPredictionMode, groupKoRoundMode, groupSelectionMode, groupMembersStatus, groupInviteAccess } from "@repo/db";
import { MEMBER_STATUS, GROUP_STATUS, SELECTION_MODE } from "../constants";
import {
  resolveInitialFixturesInternal,
  attachFixturesToGroupInternal,
} from "./fixtures";

/**
 * Find all groups where user is either creator or a joined member.
 */
export async function findGroupsByUserId(userId: number) {
  return await prisma.groups.findMany({
    where: {
      OR: [
        { creatorId: userId },
        {
          groupMembers: {
            some: {
              userId: userId,
              status: MEMBER_STATUS.JOINED,
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Find a group by ID.
 */
export async function findGroupById(id: number) {
  return await prisma.groups.findUnique({
    where: { id },
  });
}

/**
 * Create a new group.
 */
export async function createGroup(
  data: Prisma.groupsCreateInput
): Promise<Prisma.groupsGetPayload<{}>> {
  return await prisma.groups.create({
    data,
  });
}

/**
 * Create a group member.
 */
export async function createGroupMember(
  data: {
    groupId: number;
    userId: number;
    role: "owner" | "member";
    status: "joined";
  }
) {
  return await prisma.groupMembers.create({
    data,
  });
}

/**
 * Create group rules (internal - always wraps transaction).
 */
async function createGroupRulesInternal(
  tx: Prisma.TransactionClient,
  groupId: number,
  selectionMode: "games" | "teams" | "leagues",
  teamIds: number[],
  leagueIds: number[],
  inviteAccess?: "all" | "admin_only"
): Promise<void> {
  const inviteAccessData =
    inviteAccess !== undefined ? { inviteAccess: inviteAccess as groupInviteAccess } : {};
  if (selectionMode === "games") {
    await tx.groupRules.create({
      data: {
        groupId,
        selectionMode: SELECTION_MODE.GAMES,
        groupTeamsIds: [],
        groupLeaguesIds: [],
        ...inviteAccessData,
      },
    });
  } else if (selectionMode === "leagues") {
    await tx.groupRules.create({
      data: {
        groupId,
        selectionMode: SELECTION_MODE.LEAGUES,
        groupTeamsIds: [],
        groupLeaguesIds: leagueIds,
        ...inviteAccessData,
      },
    });
  } else {
    // teams
    await tx.groupRules.create({
      data: {
        groupId,
        selectionMode: SELECTION_MODE.TEAMS,
        groupTeamsIds: teamIds,
        groupLeaguesIds: [],
        ...inviteAccessData,
      },
    });
  }
}

/**
 * Update a group.
 */
export async function updateGroup(
  id: number,
  data: Prisma.groupsUpdateInput
): Promise<Prisma.groupsGetPayload<{}>> {
  return await prisma.groups.update({
    where: { id },
    data,
  });
}

/**
 * Find group rules by group ID.
 */
export async function findGroupRules(
  groupId: number
): Promise<{ selectionMode: groupSelectionMode; inviteAccess?: groupInviteAccess } | null> {
  return await prisma.groupRules.findUnique({
    where: { groupId },
    select: {
      selectionMode: true,
      inviteAccess: true,
    },
  });
}

/**
 * Publish a group with rules update in a single transaction.
 * Updates group status to "active" and optionally updates name, privacy, and groupRules.
 * Does not perform business validations - that's the service layer's responsibility.
 */
export async function publishGroupInternal(data: {
  groupId: number;
  status: typeof GROUP_STATUS.ACTIVE;
  name?: string;
  privacy?: groupPrivacy;
  onTheNosePoints?: number;
  correctDifferencePoints?: number;
  outcomePoints?: number;
  predictionMode?: groupPredictionMode;
  koRoundMode?: groupKoRoundMode;
  inviteAccess?: groupInviteAccess;
}): Promise<Prisma.groupsGetPayload<{}>> {
  return await prisma.$transaction(async (tx) => {
    // 1. Update groups table
    const updateData: Prisma.groupsUpdateInput = {
      status: GROUP_STATUS.ACTIVE,
    };

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.privacy !== undefined) {
      updateData.privacy = data.privacy;
    }

    const group = await tx.groups.update({
      where: { id: data.groupId },
      data: updateData,
    });

    // 2. Update or create groupRules
    const existingRules = await tx.groupRules.findUnique({
      where: { groupId: data.groupId },
    });

    if (existingRules) {
      // Update existing rules
      const rulesUpdateData: Prisma.groupRulesUpdateInput = {};

      if (data.onTheNosePoints !== undefined) {
        rulesUpdateData.onTheNosePoints = data.onTheNosePoints;
      }

      if (data.correctDifferencePoints !== undefined) {
        rulesUpdateData.correctDifferencePoints = data.correctDifferencePoints;
      }

      if (data.outcomePoints !== undefined) {
        rulesUpdateData.outcomePoints = data.outcomePoints;
      }

      if (data.predictionMode !== undefined) {
        rulesUpdateData.predictionMode = data.predictionMode;
      }

      if (data.koRoundMode !== undefined) {
        rulesUpdateData.koRoundMode = data.koRoundMode;
      }

      if (data.inviteAccess !== undefined) {
        rulesUpdateData.inviteAccess = data.inviteAccess;
      }

      // Only update if there are fields to update
      if (Object.keys(rulesUpdateData).length > 0) {
        await tx.groupRules.update({
          where: { groupId: data.groupId },
          data: rulesUpdateData,
        });
      }
    } else {
      // Create new rules with defaults + provided values
      // Get existing selection mode from group (should exist, but handle edge case)
      const groupData = await tx.groups.findUnique({
        where: { id: data.groupId },
        select: { id: true },
      });

      if (!groupData) {
        throw new Error(`Group with id ${data.groupId} not found`);
      }

      await tx.groupRules.create({
        data: {
          groupId: data.groupId,
          selectionMode: SELECTION_MODE.GAMES, // Default fallback
          groupTeamsIds: [],
          groupLeaguesIds: [],
          onTheNosePoints: data.onTheNosePoints ?? 3,
          correctDifferencePoints: data.correctDifferencePoints ?? 2,
          outcomePoints: data.outcomePoints ?? 1,
          predictionMode:
            data.predictionMode ??
            groupPredictionMode.CorrectScore,
          koRoundMode:
            data.koRoundMode ??
            groupKoRoundMode.FullTime,
          inviteAccess:
            data.inviteAccess ?? groupInviteAccess.all,
        },
      });
    }

    return group;
  });
}

/**
 * Delete a group.
 */
export async function deleteGroup(id: number) {
  return await prisma.groups.delete({
    where: { id },
  });
}

/**
 * Create group with member and rules in a single transaction.
 */
export async function createGroupWithMemberAndRules(data: {
  name: string;
  creatorId: number;
  privacy: groupPrivacy;
  selectionMode: "games" | "teams" | "leagues";
  fixtureIds: number[];
  teamIds: number[];
  leagueIds: number[];
  now: number;
  inviteAccess?: "all" | "admin_only";
}): Promise<Prisma.groupsGetPayload<{}>> {
  return await prisma.$transaction(async (tx) => {
    // Create group
    const group = await tx.groups.create({
      data: {
        name: data.name,
        creatorId: data.creatorId,
        privacy: data.privacy,
        status: GROUP_STATUS.DRAFT,
      },
    });

    // Create group member (creator)
    await tx.groupMembers.create({
      data: {
        groupId: group.id,
        userId: data.creatorId,
        role: "owner",
        status: MEMBER_STATUS.JOINED,
      },
    });

    // Resolve fixtures and create rules based on selection mode
    const selMode = data.selectionMode;
    const modeLeagues =
      selMode === SELECTION_MODE.LEAGUES ? data.leagueIds ?? [] : [];
    const modeTeams = selMode === SELECTION_MODE.TEAMS ? data.teamIds ?? [] : [];

    const fixtureIdsToUse = await resolveInitialFixturesInternal(
      tx,
      selMode,
      data.fixtureIds,
      modeTeams,
      modeLeagues,
      data.now
    );

    await createGroupRulesInternal(
      tx,
      group.id,
      selMode,
      modeTeams,
      modeLeagues,
      data.inviteAccess
    );

    await attachFixturesToGroupInternal(tx, group.id, fixtureIdsToUse);

    return group;
  });
}

/**
 * Find group members with users for predictions overview.
 */
export async function findGroupMembersWithUsers(groupId: number) {
  const members = await prisma.groupMembers.findMany({
    where: {
      groupId,
      status: MEMBER_STATUS.JOINED,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      userId: true,
    },
  });

  const userIds = members.map((m) => m.userId);
  const users = await prisma.users.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      username: true,
    },
  });

  return { members, users };
}

/**
 * Count joined members in a group.
 */
export async function countGroupMembers(groupId: number): Promise<number> {
  return prisma.groupMembers.count({
    where: { groupId, status: MEMBER_STATUS.JOINED },
  });
}

/**
 * Find a group by its invite code.
 */
export async function findGroupByInviteCode(inviteCode: string) {
  return prisma.groups.findFirst({
    where: { inviteCode } as Prisma.groupsWhereInput,
  });
}

/**
 * Find an existing group member record (any status).
 */
export async function findGroupMember(groupId: number, userId: number) {
  return prisma.groupMembers.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

/**
 * Update a group member record.
 */
export async function updateGroupMember(
  id: number,
  data: { status: string }
) {
  return prisma.groupMembers.update({
    where: { id },
    data: { status: data.status as groupMembersStatus },
  });
}
