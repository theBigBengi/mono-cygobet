// groups/service/badge-evaluation.ts
// Evaluate and award badges for official groups based on badge criteria.

import { prisma } from "@repo/db";
import { getLogger } from "../../../../logger";
import { getGroupRanking } from "./ranking";
import { MEMBER_STATUS } from "../constants";

const log = getLogger("BadgeEvaluation");

/**
 * Evaluate a single badge's criteria and return qualifying user IDs.
 * Shared logic used by both single and bulk award functions.
 */
async function evaluateBadge(
  badge: { id: number; criteriaType: string; criteriaValue: number },
  groupId: number,
  creatorId: number
): Promise<number> {
  let qualifyingUserIds: number[] = [];

  switch (badge.criteriaType) {
    case "participation": {
      const members = await prisma.groupMembers.findMany({
        where: { groupId, status: MEMBER_STATUS.JOINED },
        select: { userId: true },
      });
      qualifyingUserIds = members.map((m) => m.userId);
      break;
    }

    case "top_n": {
      const ranking = await getGroupRanking(groupId, creatorId);
      qualifyingUserIds = ranking.data
        .filter((r) => r.rank <= badge.criteriaValue)
        .map((r) => r.userId);
      break;
    }

    case "exact_predictions": {
      const predictions = await prisma.groupPredictions.groupBy({
        by: ["userId"],
        where: {
          groupId,
          winningCorrectScore: true,
          settledAt: { not: null },
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: badge.criteriaValue } },
        },
      });
      qualifyingUserIds = predictions.map((p) => p.userId);
      break;
    }

    case "custom": {
      log.debug(
        { groupId, badgeId: badge.id },
        "Custom badge criteria, skipping auto-evaluation"
      );
      return 0;
    }

    default: {
      log.warn(
        { groupId, badgeId: badge.id, criteriaType: badge.criteriaType },
        "Unknown badge criteria type"
      );
      return 0;
    }
  }

  if (qualifyingUserIds.length === 0) {
    log.debug(
      { groupId, badgeId: badge.id },
      "No qualifying members for badge"
    );
    return 0;
  }

  // Check which users already have this badge (skip duplicates)
  const existing = await prisma.userEarnedBadges.findMany({
    where: {
      badgeId: badge.id,
      userId: { in: qualifyingUserIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existing.map((e) => e.userId));
  const newUserIds = qualifyingUserIds.filter(
    (id) => !existingUserIds.has(id)
  );

  if (newUserIds.length === 0) {
    log.debug(
      { groupId, badgeId: badge.id },
      "All qualifying members already have the badge"
    );
    return 0;
  }

  // Award badges
  await prisma.userEarnedBadges.createMany({
    data: newUserIds.map((userId) => ({
      userId,
      badgeId: badge.id,
      groupId,
    })),
    skipDuplicates: true,
  });

  log.info(
    { groupId, badgeId: badge.id, awarded: newUserIds.length },
    "Badges awarded"
  );

  return newUserIds.length;
}

/**
 * Evaluate badge criteria for a group and award badges to qualifying members.
 * Evaluates all badge tiers independently and returns total newly awarded.
 */
export async function evaluateGroupBadges(groupId: number): Promise<number> {
  // 1. Fetch all badge definitions for this group
  const badges = await prisma.groupBadges.findMany({
    where: { groupId },
  });

  if (badges.length === 0) {
    log.debug({ groupId }, "No badges defined for group, skipping");
    return 0;
  }

  // 2. Get the group (needed for status check + ranking query)
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { creatorId: true, isOfficial: true, status: true },
  });

  if (!group) {
    log.warn({ groupId }, "Group not found for badge evaluation");
    return 0;
  }

  if (group.status !== "ended") {
    throw new Error(
      `Cannot award badges: group status is "${group.status}". Badges can only be awarded after the group has ended.`
    );
  }

  let totalAwarded = 0;

  // 3. Evaluate each badge tier independently
  for (const badge of badges) {
    totalAwarded += await evaluateBadge(badge, groupId, group.creatorId);
  }

  return totalAwarded;
}

/**
 * Evaluate and award a single badge by its ID.
 * Returns the number of newly awarded badges.
 */
export async function evaluateSingleBadge(
  groupId: number,
  badgeId: number
): Promise<number> {
  const badge = await prisma.groupBadges.findFirst({
    where: { id: badgeId, groupId },
  });

  if (!badge) {
    throw new Error("Badge not found in this group");
  }

  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { creatorId: true, status: true },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  if (group.status !== "ended") {
    throw new Error(
      `Cannot award badges: group status is "${group.status}". Badges can only be awarded after the group has ended.`
    );
  }

  return evaluateBadge(badge, groupId, group.creatorId);
}
