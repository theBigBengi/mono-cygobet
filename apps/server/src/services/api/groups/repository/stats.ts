// groups/repository/stats.ts
// Repository functions for group statistics.

import { prisma } from "@repo/db";
import { MEMBER_STATUS } from "../constants";
import type { FixtureWithRelations } from "../types";
import { FIXTURE_SELECT_BASE } from "../../fixtures/selects";
import { buildUpcomingFixturesWhere } from "../../fixtures/queries";

/**
 * Find groups stats in batch for getMyGroups optimization.
 * Returns Maps for efficient lookup.
 */
export async function findGroupsStatsBatch(
  groupIds: number[],
  userId: number,
  now: number
) {
  if (groupIds.length === 0) {
    return {
      memberCountByGroupId: new Map<number, number>(),
      fixtureCountByGroupId: new Map<number, number>(),
      predictionCountByGroupId: new Map<number, number>(),
      hasUnpredictedGamesByGroupId: new Set<number>(),
      nextGameByGroupId: new Map<number, FixtureWithRelations | null>(),
      firstGameByGroupId: new Map<number, FixtureWithRelations | null>(),
    };
  }

  const [
    memberCountsRaw,
    fixtureCountsRaw,
    predictionCountsRaw,
    unpredictedGamesRaw,
    nextGamesRaw,
    firstGamesRaw,
  ] = await Promise.all([
    // Query 1: memberCount per group
    prisma.groupMembers.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        status: MEMBER_STATUS.JOINED,
      },
      _count: { groupId: true },
    }),
    // Query 2: totalFixtures per group
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds } },
      _count: { groupId: true },
    }),
    // Query 3: predictionsCount per group
    prisma.groupPredictions.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        userId,
      },
      _count: { groupId: true },
    }),
    // Query 4: unpredicted games per group
    prisma.groupFixtures.findMany({
      where: {
        groupId: { in: groupIds },
        fixtures: buildUpcomingFixturesWhere({ now }),
        NOT: {
          groupPredictions: {
            some: {
              userId,
            },
          },
        },
      },
      select: { groupId: true },
    }),
    // Query 5: next games per group
    prisma.groupFixtures.findMany({
      where: {
        groupId: { in: groupIds },
        fixtures: buildUpcomingFixturesWhere({ now }),
      },
      orderBy: {
        fixtures: {
          startTs: "asc",
        },
      },
      select: {
        groupId: true,
        fixtures: {
          select: FIXTURE_SELECT_BASE,
        },
      },
    }),
    // Query 6: first games for draft groups
    prisma.groupFixtures.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: {
        fixtures: {
          startTs: "asc",
        },
      },
      select: {
        groupId: true,
        fixtures: {
          select: FIXTURE_SELECT_BASE,
        },
      },
    }),
  ]);

  // Build Maps: groupId -> data (cleaner - service לא יעשה transform)
  const memberCountByGroupId = new Map<number, number>();
  memberCountsRaw.forEach((item) =>
    memberCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const fixtureCountByGroupId = new Map<number, number>();
  fixtureCountsRaw.forEach((item) =>
    fixtureCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const predictionCountByGroupId = new Map<number, number>();
  predictionCountsRaw.forEach((item) =>
    predictionCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const hasUnpredictedGamesByGroupId = new Set<number>();
  unpredictedGamesRaw.forEach((item) =>
    hasUnpredictedGamesByGroupId.add(item.groupId)
  );

  const nextGameByGroupId = new Map<number, FixtureWithRelations | null>();
  // Group by groupId and take first (earliest) for each
  const nextGamesByGroup = new Map<
    number,
    (typeof nextGamesRaw)[0]
  >();
  nextGamesRaw.forEach((item) => {
    if (!nextGamesByGroup.has(item.groupId)) {
      nextGamesByGroup.set(item.groupId, item);
    }
  });
  nextGamesByGroup.forEach((item, groupId) => {
    const rawFixture = item.fixtures as FixtureWithRelations | null | undefined;
    nextGameByGroupId.set(groupId, rawFixture ?? null);
  });

  const firstGameByGroupId = new Map<number, FixtureWithRelations | null>();
  // Group by groupId and take first (earliest) for each
  const firstGamesByGroup = new Map<
    number,
    (typeof firstGamesRaw)[0]
  >();
  firstGamesRaw.forEach((item) => {
    if (!firstGamesByGroup.has(item.groupId)) {
      firstGamesByGroup.set(item.groupId, item);
    }
  });
  firstGamesByGroup.forEach((item, groupId) => {
    const rawFixture = item.fixtures as FixtureWithRelations | null | undefined;
    firstGameByGroupId.set(groupId, rawFixture ?? null);
  });

  return {
    memberCountByGroupId,
    fixtureCountByGroupId,
    predictionCountByGroupId,
    hasUnpredictedGamesByGroupId,
    nextGameByGroupId,
    firstGameByGroupId,
  };
}
