// groups/service/badge-evaluation.ts
// Evaluate and award badges for official groups based on badge criteria.

import { prisma } from "@repo/db";
import { getLogger } from "../../../../logger";
import { getGroupRanking } from "./ranking";
import { MEMBER_STATUS } from "../constants";

const log = getLogger("BadgeEvaluation");

/**
 * Evaluate badge criteria for a group and award badges to qualifying members.
 * Returns the number of badges newly awarded.
 */
export async function evaluateGroupBadges(groupId: number): Promise<number> {
  // 1. Fetch the group's badge definition
  const badge = await prisma.groupBadges.findUnique({
    where: { groupId },
  });

  if (!badge) {
    log.debug({ groupId }, "No badge defined for group, skipping");
    return 0;
  }

  // 2. Get the group creator (needed for ranking query)
  const group = await prisma.groups.findUnique({
    where: { id: groupId },
    select: { creatorId: true, isOfficial: true },
  });

  if (!group) {
    log.warn({ groupId }, "Group not found for badge evaluation");
    return 0;
  }

  // 3. Determine qualifying user IDs based on criteria
  let qualifyingUserIds: number[] = [];

  switch (badge.criteriaType) {
    case "participation": {
      // All joined members earn the badge
      const members = await prisma.groupMembers.findMany({
        where: { groupId, status: MEMBER_STATUS.JOINED },
        select: { userId: true },
      });
      qualifyingUserIds = members.map((m) => m.userId);
      break;
    }

    case "top_n": {
      // Top N members by ranking
      const ranking = await getGroupRanking(groupId, group.creatorId);
      qualifyingUserIds = ranking.data
        .filter((r) => r.rank <= badge.criteriaValue)
        .map((r) => r.userId);
      break;
    }

    case "exact_predictions": {
      // Members with >= N exact score predictions in this group
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
      // Custom criteria: no auto-evaluation, admin awards manually via API
      log.debug({ groupId }, "Custom badge criteria, skipping auto-evaluation");
      return 0;
    }

    default: {
      log.warn(
        { groupId, criteriaType: badge.criteriaType },
        "Unknown badge criteria type"
      );
      return 0;
    }
  }

  if (qualifyingUserIds.length === 0) {
    log.debug({ groupId }, "No qualifying members for badge");
    return 0;
  }

  // 4. Check which users already have this badge (skip duplicates)
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
    log.debug({ groupId }, "All qualifying members already have the badge");
    return 0;
  }

  // 5. Award badges
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
