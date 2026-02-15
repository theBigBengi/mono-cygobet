// groups/repository/stats.ts
// Repository functions for group statistics.

import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import type { Prisma } from "@repo/db";
import { LIVE_STATES, NOT_STARTED_STATES } from "@repo/utils";
import { getTodayUtcBounds } from "../../../../utils/dates";
import { MEMBER_STATUS } from "../constants";
import { FIXTURE_SELECT_BASE } from "../../fixtures/selects";
import { buildUpcomingFixturesWhere } from "../../fixtures/queries";

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
      completedFixturesCountByGroupId: new Map<number, number>(),
      hasUnpredictedGamesByGroupId: new Set<number>(),
      nextGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      firstGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      lastGameByGroupId: new Map<number, FixtureWithBaseSelect | null>(),
      unpredictedGamesCountByGroupId: new Map<number, number>(),
      todayGamesCountByGroupId: new Map<number, number>(),
      todayUnpredictedCountByGroupId: new Map<number, number>(),
      liveGamesCountByGroupId: new Map<number, number>(),
      missedPredictionsCountByGroupId: new Map<number, number>(),
      userRankByGroupId: new Map<number, number>(),
      userPredictionsByGroupFixture: new Map<string, any>(),
    };
  }

  const { startTs: todayStartTs, endTs: todayEndTs } = getTodayUtcBounds(now);

  const [
    memberCountsRaw,
    fixtureCountsRaw,
    predictionCountsRaw,
    completedFixturesCountsRaw,
    nextGamesRaw,
    firstGamesRaw,
    lastGamesRaw,
    unpredictedCountsRaw,
    todayCountsRaw,
    todayUnpredictedCountsRaw,
    liveCountsRaw,
    missedPredictionsCountsRaw,
    userPredictionsRaw,
    userRanksRaw,
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
    // Query 4: completedFixturesCount per group (FT only)
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: { state: "FT" },
      },
      _count: { groupId: true },
    }),
    // Query 5: next games per group
    prisma.groupFixtures.findMany({
      where: {
        groupId: { in: groupIds },
        fixtures: buildUpcomingFixturesWhere({ now }),
      },
      orderBy: [
        { fixtures: { startTs: "asc" } },
        { fixtureId: "asc" },
      ],
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
    // Query 7: last games per group (latest fixture)
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
    // Query 8: unpredictedGamesCount per group (NS games without user prediction); hasUnpredictedGames derived from count > 0
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
    // Query 9: todayGamesCount per group
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
    // Query 10: todayUnpredictedCount per group (today's NS games without prediction)
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: {
          state: { in: [...NOT_STARTED_STATES] as FixtureState[] },
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
    // Query 11: liveGamesCount per group
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: { state: { in: [...LIVE_STATES] as FixtureState[] } },
      },
      _count: { groupId: true },
    }),
    // Query 12: missedPredictionsCount per group (FT games without user prediction)
    prisma.groupFixtures.groupBy({
      by: ["groupId"],
      where: {
        groupId: { in: groupIds },
        fixtures: { state: "FT" },
        NOT: {
          groupPredictions: {
            some: { userId },
          },
        },
      },
      _count: { groupId: true },
    }),
    // Query 13: user predictions for next games
    prisma.groupPredictions.findMany({
      where: {
        groupId: { in: groupIds },
        userId,
      },
      select: {
        groupId: true,
        groupFixtureId: true,
        prediction: true,
        updatedAt: true,
        placedAt: true,
        points: true,
        groupFixtures: {
          select: {
            fixtureId: true,
          },
        },
      },
    }),
    // Query 14: user rank per group (using raw SQL for ranking calculation)
    prisma.$queryRaw<{ group_id: number; user_rank: number }[]>`
      WITH ranked AS (
        SELECT
          gp.group_id,
          gp.user_id,
          COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points,
          COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS correct_score_count,
          ROW_NUMBER() OVER (
            PARTITION BY gp.group_id
            ORDER BY
              COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) DESC,
              COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) DESC
          ) AS user_rank
        FROM group_predictions gp
        JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
        WHERE gp.group_id = ANY(${groupIds})
          AND gm.status = 'joined'::group_members_status
        GROUP BY gp.group_id, gp.user_id
      )
      SELECT group_id, user_rank::int
      FROM ranked
      WHERE user_id = ${userId}
    `,
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

  const completedFixturesCountByGroupId = new Map<number, number>();
  (completedFixturesCountsRaw as GroupByCountItem[]).forEach((item) =>
    completedFixturesCountByGroupId.set(item.groupId, item._count.groupId)
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

  type GroupByCountItem = { groupId: number; _count: { groupId: number } };
  const todayGamesCountByGroupId = new Map<number, number>();
  (todayCountsRaw as GroupByCountItem[]).forEach((item) =>
    todayGamesCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const todayUnpredictedCountByGroupId = new Map<number, number>();
  (todayUnpredictedCountsRaw as GroupByCountItem[]).forEach((item) =>
    todayUnpredictedCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const liveGamesCountByGroupId = new Map<number, number>();
  (liveCountsRaw as GroupByCountItem[]).forEach((item) =>
    liveGamesCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const missedPredictionsCountByGroupId = new Map<number, number>();
  (missedPredictionsCountsRaw as GroupByCountItem[]).forEach((item) =>
    missedPredictionsCountByGroupId.set(item.groupId, item._count.groupId)
  );

  const userRankByGroupId = new Map<number, number>();
  userRanksRaw.forEach((item) =>
    userRankByGroupId.set(item.group_id, item.user_rank)
  );

  // Map predictions by groupId_fixtureId for quick lookup
  type PredictionData = {
    home: number;
    away: number;
    updatedAt: Date;
    placedAt: Date;
    settled: boolean;
    points: string | null;
  };
  const userPredictionsByGroupFixture = new Map<string, PredictionData>();
  userPredictionsRaw.forEach((pred) => {
    const fixtureId = pred.groupFixtures?.fixtureId;
    if (!fixtureId) return;

    // Parse prediction string "home:away"
    const [homeStr, awayStr] = (pred.prediction ?? "").split(":");
    const home = parseInt(homeStr, 10);
    const away = parseInt(awayStr, 10);
    if (isNaN(home) || isNaN(away)) return;

    const key = `${pred.groupId}_${fixtureId}`;
    userPredictionsByGroupFixture.set(key, {
      home,
      away,
      updatedAt: pred.updatedAt,
      placedAt: pred.placedAt,
      settled: false, // Not directly available, will be calculated based on points
      points: pred.points,
    });
  });

  return {
    memberCountByGroupId,
    fixtureCountByGroupId,
    predictionCountByGroupId,
    completedFixturesCountByGroupId,
    hasUnpredictedGamesByGroupId,
    nextGameByGroupId,
    firstGameByGroupId,
    lastGameByGroupId,
    unpredictedGamesCountByGroupId,
    todayGamesCountByGroupId,
    todayUnpredictedCountByGroupId,
    liveGamesCountByGroupId,
    missedPredictionsCountByGroupId,
    userRankByGroupId,
    userPredictionsByGroupFixture,
  };
}
