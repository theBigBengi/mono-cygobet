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
  badges: Array<{
    id: number;
    name: string;
    description: string;
    icon: string;
    criteriaType: string;
    criteriaValue: number;
  }>
): AdminOfficialGroupItem {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    status: group.status as "draft" | "active" | "ended",
    memberCount,
    fixtureCount,
    createdAt: group.createdAt.toISOString(),
    badges,
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
        groupBadges: true,
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
      g.groupBadges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
      }))
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

  // 3. Set isOfficial flag + remove admin as member
  await Promise.all([
    prisma.groups.update({
      where: { id: group.id },
      data: { isOfficial: true },
    }),
    prisma.groupMembers.deleteMany({
      where: { groupId: group.id, userId: adminUserId },
    }),
  ]);

  // 4. Create badges if provided
  let badges: AdminOfficialGroupItem["badges"] = [];
  if (body.badges && body.badges.length > 0) {
    await prisma.groupBadges.createMany({
      data: body.badges.map((b) => ({
        groupId: group.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue ?? 1,
      })),
    });
    const created = await prisma.groupBadges.findMany({
      where: { groupId: group.id },
    });
    badges = created.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      criteriaType: b.criteriaType,
      criteriaValue: b.criteriaValue,
    }));
  }

  // Count fixtures
  const fixtureCount = await prisma.groupFixtures.count({
    where: { groupId: group.id },
  });

  log.info({ groupId: group.id }, "Official group created");

  return mapGroupToItem(
    { ...published, description: body.description ?? null },
    0,
    fixtureCount,
    badges
  );
}

export async function getOfficialGroup(
  groupId: number
): Promise<AdminOfficialGroupItem> {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    include: {
      groupBadges: true,
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
    group.groupBadges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      criteriaType: b.criteriaType,
      criteriaValue: b.criteriaValue,
    }))
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

  // Update badges (replace strategy: delete existing + create new)
  if (body.badges !== undefined) {
    // Delete all existing badges for this group
    await prisma.groupBadges.deleteMany({ where: { groupId } });

    // Create new badges if not null
    if (body.badges !== null && body.badges.length > 0) {
      await prisma.groupBadges.createMany({
        data: body.badges.map((b) => ({
          groupId,
          name: b.name,
          description: b.description,
          icon: b.icon,
          criteriaType: b.criteriaType,
          criteriaValue: b.criteriaValue ?? 1,
        })),
      });
    }
  }

  log.info({ groupId }, "Official group updated");
  return getOfficialGroup(groupId);
}

export async function getGroupDetails(groupId: number) {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    include: {
      groupRules: true,
    },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  // Resolve creator
  const creator = await prisma.users.findUnique({
    where: { id: group.creatorId },
    select: { id: true, name: true, email: true },
  });

  const rules = group.groupRules;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    status: group.status,
    privacy: group.privacy,
    inviteCode: group.inviteCode,
    isOfficial: group.isOfficial,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    creator,
    rules: rules
      ? {
          selectionMode: rules.selectionMode,
          onTheNosePoints: rules.onTheNosePoints,
          correctDifferencePoints: rules.correctDifferencePoints,
          outcomePoints: rules.outcomePoints,
          koRoundMode: rules.koRoundMode,
          predictionMode: rules.predictionMode,
          maxMembers: rules.maxMembers,
          inviteAccess: rules.inviteAccess,
          nudgeEnabled: rules.nudgeEnabled,
          nudgeWindowMinutes: rules.nudgeWindowMinutes,
          leagueIds: rules.groupLeaguesIds,
          teamIds: rules.groupTeamsIds,
        }
      : null,
  };
}

export async function updateGroupRules(
  groupId: number,
  body: {
    onTheNosePoints?: number;
    correctDifferencePoints?: number;
    outcomePoints?: number;
    predictionMode?: string;
    koRoundMode?: string;
    maxMembers?: number;
    inviteAccess?: string;
    nudgeEnabled?: boolean;
    nudgeWindowMinutes?: number;
  }
) {
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  const updateData: Record<string, unknown> = {};
  if (body.onTheNosePoints !== undefined) updateData.onTheNosePoints = body.onTheNosePoints;
  if (body.correctDifferencePoints !== undefined) updateData.correctDifferencePoints = body.correctDifferencePoints;
  if (body.outcomePoints !== undefined) updateData.outcomePoints = body.outcomePoints;
  if (body.predictionMode !== undefined) updateData.predictionMode = body.predictionMode;
  if (body.koRoundMode !== undefined) updateData.koRoundMode = body.koRoundMode;
  if (body.maxMembers !== undefined) updateData.maxMembers = body.maxMembers;
  if (body.inviteAccess !== undefined) updateData.inviteAccess = body.inviteAccess;
  if (body.nudgeEnabled !== undefined) updateData.nudgeEnabled = body.nudgeEnabled;
  if (body.nudgeWindowMinutes !== undefined) updateData.nudgeWindowMinutes = body.nudgeWindowMinutes;

  if (Object.keys(updateData).length > 0) {
    await prisma.groupRules.update({
      where: { groupId },
      data: updateData as any,
    });
  }

  log.info({ groupId }, "Official group rules updated");
  return getGroupDetails(groupId);
}

export async function listGroupLeaderboard(
  groupId: number,
  page: number,
  perPage: number
) {
  // Verify group exists and is official
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  // Get members with their prediction stats via raw aggregation
  const totalMembers = await prisma.groupMembers.count({
    where: { groupId, status: "joined" },
  });

  // Get all prediction stats for this group
  const [totalPredictions, settledPredictions] = await Promise.all([
    prisma.groupPredictions.count({ where: { groupId } }),
    prisma.groupPredictions.count({ where: { groupId, settledAt: { not: null } } }),
  ]);

  // Get members with aggregated points - use raw query for SUM
  const membersWithPoints = await prisma.$queryRaw<
    Array<{
      user_id: number;
      name: string | null;
      username: string | null;
      image: string | null;
      total_points: string;
      predictions_count: string;
      settled_count: string;
      exact_count: string;
      difference_count: string;
      outcome_count: string;
    }>
  >`
    SELECT
      gm.user_id,
      u.name,
      u.username,
      u.image,
      COALESCE(SUM(CAST(gp.points AS NUMERIC)), 0) AS total_points,
      COUNT(gp.id) AS predictions_count,
      COUNT(gp.settled_at) AS settled_count,
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) AS exact_count,
      COUNT(CASE WHEN gp.winning_correct_difference = true AND gp.winning_correct_score = false THEN 1 END) AS difference_count,
      COUNT(CASE WHEN gp.winning_match_winner = true AND gp.winning_correct_difference = false AND gp.winning_correct_score = false THEN 1 END) AS outcome_count
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    LEFT JOIN group_predictions gp ON gp.group_id = gm.group_id AND gp.user_id = gm.user_id
    WHERE gm.group_id = ${groupId} AND gm.status = 'joined'
    GROUP BY gm.user_id, u.name, u.username, u.image
    ORDER BY total_points DESC, exact_count DESC, predictions_count DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `;

  const data = membersWithPoints.map((m, i) => ({
    userId: m.user_id,
    name: m.name,
    username: m.username,
    image: m.image,
    totalPoints: Number(m.total_points),
    predictionsCount: Number(m.predictions_count),
    settledCount: Number(m.settled_count),
    exactCount: Number(m.exact_count),
    differenceCount: Number(m.difference_count),
    outcomeCount: Number(m.outcome_count),
    rank: (page - 1) * perPage + i + 1,
  }));

  return {
    data,
    pagination: {
      page,
      perPage,
      totalItems: totalMembers,
      totalPages: Math.ceil(totalMembers / perPage) || 1,
    },
    stats: {
      totalMembers,
      totalPredictions,
      settledPredictions,
      pendingPredictions: totalPredictions - settledPredictions,
    },
  };
}

export async function listGroupFixtures(
  groupId: number,
  page: number,
  perPage: number
): Promise<{
  data: Array<{
    id: number;
    fixtureId: number;
    name: string;
    startIso: string;
    state: string;
    result: string | null;
    homeScore90: number | null;
    awayScore90: number | null;
    homeTeam: { id: number; name: string; imagePath: string | null } | null;
    awayTeam: { id: number; name: string; imagePath: string | null } | null;
    league: { id: number; name: string; imagePath: string | null } | null;
    round: string | null;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}> {
  // Verify group exists and is official
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  const where = { groupId };

  const [rows, totalCount] = await Promise.all([
    prisma.groupFixtures.findMany({
      where,
      orderBy: { fixtures: { startTs: "desc" } },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        fixtures: {
          include: {
            homeTeam: { select: { id: true, name: true, imagePath: true } },
            awayTeam: { select: { id: true, name: true, imagePath: true } },
            league: { select: { id: true, name: true, imagePath: true } },
          },
        },
      },
    }),
    prisma.groupFixtures.count({ where }),
  ]);

  const data = rows.map((gf) => {
    const f = gf.fixtures;
    return {
      id: gf.id,
      fixtureId: gf.fixtureId,
      name: f.name,
      startIso: typeof f.startIso === "object" ? (f.startIso as Date).toISOString() : String(f.startIso),
      state: f.state,
      result: f.result,
      homeScore90: f.homeScore90,
      awayScore90: f.awayScore90,
      homeTeam: f.homeTeam
        ? { id: f.homeTeam.id, name: f.homeTeam.name, imagePath: f.homeTeam.imagePath }
        : null,
      awayTeam: f.awayTeam
        ? { id: f.awayTeam.id, name: f.awayTeam.name, imagePath: f.awayTeam.imagePath }
        : null,
      league: f.league
        ? { id: f.league.id, name: f.league.name, imagePath: f.league.imagePath }
        : null,
      round: f.round,
    };
  });

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

export async function getFixturePredictions(
  groupId: number,
  groupFixtureId: number
) {
  // Verify group is official
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { id: true, isOfficial: true },
  });

  if (!group || !group.isOfficial) {
    throw new NotFoundError("Official group not found");
  }

  // Fetch group fixture with fixture details
  const gf = await prisma.groupFixtures.findFirst({
    where: { id: groupFixtureId, groupId },
    include: {
      fixtures: {
        include: {
          homeTeam: { select: { id: true, name: true, imagePath: true } },
          awayTeam: { select: { id: true, name: true, imagePath: true } },
          league: { select: { id: true, name: true, imagePath: true } },
        },
      },
    },
  });

  if (!gf) {
    throw new NotFoundError("Group fixture not found");
  }

  // Fetch all predictions for this group fixture
  const predictions = await prisma.groupPredictions.findMany({
    where: { groupFixtureId, groupId },
  });

  const totalPredictions = predictions.length;
  const settledPredictions = predictions.filter((p) => p.settledAt !== null).length;

  // Outcome breakdown (hierarchical to avoid double-counting)
  let exactScore = 0;
  let correctDifference = 0;
  let correctOutcome = 0;
  let wrong = 0;

  for (const p of predictions) {
    if (p.settledAt === null) continue;
    if (p.winningCorrectScore) {
      exactScore++;
    } else if (p.winningCorrectDifference) {
      correctDifference++;
    } else if (p.winningMatchWinner) {
      correctOutcome++;
    } else {
      wrong++;
    }
  }

  // Score distribution
  const countByPrediction = new Map<string, number>();
  for (const p of predictions) {
    countByPrediction.set(p.prediction, (countByPrediction.get(p.prediction) ?? 0) + 1);
  }

  const scoreDistribution = Array.from(countByPrediction.entries())
    .map(([prediction, count]) => ({
      prediction,
      count,
      percentage: totalPredictions > 0 ? Math.round((count / totalPredictions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const f = gf.fixtures;

  return {
    fixture: {
      id: gf.id,
      fixtureId: gf.fixtureId,
      name: f.name,
      startIso: typeof f.startIso === "object" ? (f.startIso as Date).toISOString() : String(f.startIso),
      state: f.state,
      result: f.result,
      homeScore90: f.homeScore90,
      awayScore90: f.awayScore90,
      homeTeam: f.homeTeam
        ? { id: f.homeTeam.id, name: f.homeTeam.name, imagePath: f.homeTeam.imagePath }
        : null,
      awayTeam: f.awayTeam
        ? { id: f.awayTeam.id, name: f.awayTeam.name, imagePath: f.awayTeam.imagePath }
        : null,
      league: f.league
        ? { id: f.league.id, name: f.league.name, imagePath: f.league.imagePath }
        : null,
      round: f.round,
    },
    stats: {
      totalPredictions,
      settledPredictions,
      outcomes: {
        exactScore,
        correctDifference,
        correctOutcome,
        wrong,
      },
    },
    scoreDistribution,
  };
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
