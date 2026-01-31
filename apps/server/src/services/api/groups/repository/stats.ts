// groups/repository/stats.ts
// Repository functions for group statistics.

import { prisma, FixtureState } from "@repo/db";
import type { Prisma } from "@repo/db";
import { getTodayUtcBounds } from "../../../../utils/dates";
import { MEMBER_STATUS } from "../constants";
import { FIXTURE_SELECT_BASE } from "../../fixtures/selects";
import { buildUpcomingFixturesWhere } from "../../fixtures/queries";

const LIVE_STATES = [FixtureState.LIVE] as const;

// טיפוס משותף ל-fixture עם base select
type FixtureWithBaseSelect = Prisma.fixturesGetPayload<{
  select: typeof FIXTURE_SELECT_BASE;
}>;

type GroupFixtureWithFixture = Prisma.groupFixturesGetPayload<{
  select: {
    groupId: true;
    fixtures: {
      select: typeof FIXTURE_SELECT_BASE;
    };
  };
}>;

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
      nextGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      firstGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      lastGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      unpredictedGamesCountByGroupId: new Map<number, number>(),
      todayGamesCountByGroupId: new Map<number, number>(),
      todayUnpredictedCountByGroupId: new Map<number, number>(),
      liveGamesCountByGroupId: new Map<number, number>(),
    };
  }

  const { startTs: todayStartTs, endTs: todayEndTs } = getTodayUtcBounds(now);

  const [
    memberCountsRaw,
    fixtureCountsRaw,
    predictionCountsRaw,
    nextGamesRaw,
    firstGamesRaw,
    lastGamesRaw,
    unpredictedCountsRaw,
    todayCountsRaw,
    todayUnpredictedCountsRaw,
    liveCountsRaw,
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
    // Query 4: next games per group
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
    // Query 5: first games for draft groups
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
    // Query 6: last games per group (latest fixture)
    prisma.groupFixtures.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: {
        fixtures: {
          startTs: "desc",
        },
      },
      select: {
        groupId: true,
        fixtures: {
          select: FIXTURE_SELECT_BASE,
        },
      },
    }),
    // Query 7: unpredictedGamesCount per group (NS games without user prediction); hasUnpredictedGames derived from count > 0
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: buildUpcomingFixturesWhere({ now }),
        NOT: {
          groupPredictions: {
            some: { userId },
          },
        },
      },
      _count: { groupId: true },
    }),
    // Query 8: todayGamesCount per group
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: {
          startTs: { gte: todayStartTs, lt: todayEndTs },
        },
      },
      _count: { groupId: true },
    }),
    // Query 9: todayUnpredictedCount per group (today's NS games without prediction)
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: {
          state: FixtureState.NS,
          startTs: { gte: todayStartTs, lt: todayEndTs },
        },
        NOT: {
          groupPredictions: {
            some: { userId },
          },
        },
      },
      _count: { groupId: true },
    }),
    // Query 10: liveGamesCount per group
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: { state: { in: [...LIVE_STATES] } },
      },
      _count: { groupId: true },
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
  unpredictedCountsRaw.forEach((item) =>
    hasUnpredictedGamesByGroupId.add(item.groupId)
  );

  const nextGameByGroupId = new Map<number, FixtureWithBaseSelect | null>();
  // Group by groupId and take first (earliest) for each
  const nextGamesByGroup = new Map<number, GroupFixtureWithFixture>();
  nextGamesRaw.forEach((item) => {
    if (!nextGamesByGroup.has(item.groupId)) {
      nextGamesByGroup.set(item.groupId, item);
    }
  });
  nextGamesByGroup.forEach((item, groupId) => {
    const rawFixture = item.fixtures ?? null;
    nextGameByGroupId.set(groupId, rawFixture);
  });

  const firstGameByGroupId = new Map<number, FixtureWithBaseSelect | null>();
  // Group by groupId and take first (earliest) for each
  const firstGamesByGroup = new Map<number, GroupFixtureWithFixture>();
  firstGamesRaw.forEach((item) => {
    if (!firstGamesByGroup.has(item.groupId)) {
      firstGamesByGroup.set(item.groupId, item);
    }
  });
  firstGamesByGroup.forEach((item, groupId) => {
    const rawFixture = item.fixtures ?? null;
    firstGameByGroupId.set(groupId, rawFixture);
  });

  const lastGameByGroupId = new Map<number, FixtureWithBaseSelect | null>();
  // Group by groupId and take first (latest) for each
  const lastGamesByGroup = new Map<number, GroupFixtureWithFixture>();
  lastGamesRaw.forEach((item) => {
    if (!lastGamesByGroup.has(item.groupId)) {
      lastGamesByGroup.set(item.groupId, item);
    }
  });
  lastGamesByGroup.forEach((item, groupId) => {
    const rawFixture = item.fixtures ?? null;
    lastGameByGroupId.set(groupId, rawFixture);
  });

  const unpredictedGamesCountByGroupId = new Map<number, number>();
  unpredictedCountsRaw.forEach((item) =>
    unpredictedGamesCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const todayGamesCountByGroupId = new Map<number, number>();
  todayCountsRaw.forEach((item) =>
    todayGamesCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const todayUnpredictedCountByGroupId = new Map<number, number>();
  todayUnpredictedCountsRaw.forEach((item) =>
    todayUnpredictedCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const liveGamesCountByGroupId = new Map<number, number>();
  liveCountsRaw.forEach((item) =>
    liveGamesCountByGroupId.set(item.groupId, item._count.groupId)
  );

  return {
    memberCountByGroupId,
    fixtureCountByGroupId,
    predictionCountByGroupId,
    hasUnpredictedGamesByGroupId,
    nextGameByGroupId,
    firstGameByGroupId,
    lastGameByGroupId,
    unpredictedGamesCountByGroupId,
    todayGamesCountByGroupId,
    todayUnpredictedCountByGroupId,
    liveGamesCountByGroupId,
  };
}
