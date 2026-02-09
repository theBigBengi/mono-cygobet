// groups/service/settlement.ts
// Settlement service for calculating points on finished fixtures.

import { FINISHED_STATES, CANCELLED_STATES } from "@repo/utils";
import { prisma } from "@repo/db";
import type { FixtureState } from "@repo/db";
import { getLogger } from "../../../../logger";
import { parseScores } from "../../../../etl/transform/fixtures.transform";
import { calculateScore, type ScoringRules } from "../scoring";
import { getGroupRanking } from "./ranking";
import { emitSystemEvent } from "./chat-events";
import type { TypedIOServer } from "../../../../types/socket";

const log = getLogger("Settlement");

export type SettlementResult = {
  /** Number of predictions successfully settled */
  settled: number;
  /** Number of predictions skipped (missing data, etc.) */
  skipped: number;
  /** Number of groups transitioned from active to ended (all fixtures terminal) */
  groupsEnded: number;
};

/**
 * Settle predictions for finished fixtures.
 *
 * This function processes all unsettled predictions for the given fixture IDs,
 * calculates their points based on group scoring rules, and updates them in a transaction.
 * After settling, it transitions groups to "ended" when all their fixtures are terminal.
 *
 * Flow:
 * 1. Load finished fixtures (FT, AET, FT_PEN)
 * 2. Find group fixtures
 * 3. Load scoring rules
 * 4. Load unsettled predictions
 * 5. Calculate scores
 * 6. Batch update in transaction
 * 7. Transition completed groups to "ended" (all fixtures in FT/CAN/INT)
 *
 * @param fixtureIds - Array of fixture IDs to settle predictions for
 * @param io - Optional Socket.IO server for broadcasting ranking_change events
 * @returns Object with settled, skipped, and groupsEnded counts
 */
export async function settlePredictionsForFixtures(
  fixtureIds: number[],
  io?: TypedIOServer
): Promise<SettlementResult> {
  // Early return if no fixture IDs provided
  if (!fixtureIds.length) {
    log.debug("No fixture IDs provided");
    return { settled: 0, skipped: 0, groupsEnded: 0 };
  }

  log.info({ fixtureIds, count: fixtureIds.length }, "Starting settlement");

  // Step 1: Load finished fixtures (FT, AET, FT_PEN) including period scores for KO scoring
  const fixtures = await prisma.fixtures.findMany({
    where: {
      id: { in: fixtureIds },
      state: { in: [...FINISHED_STATES] as FixtureState[] },
    },
    select: {
      id: true,
      homeScore90: true,
      awayScore90: true,
      homeScoreET: true,
      awayScoreET: true,
      penHome: true,
      penAway: true,
      result: true,
      state: true,
    },
  });

  if (!fixtures.length) {
    log.debug("No finished fixtures found");
    return { settled: 0, skipped: 0, groupsEnded: 0 };
  }

  // Build fixture map
  const fixtureMap = new Map(fixtures.map((f) => [f.id, f]));

  log.debug({ fixtureCount: fixtures.length }, "Loaded finished fixtures");

  // Step 2: Find group fixtures
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: {
      fixtureId: { in: fixtureIds },
    },
    select: {
      id: true,
      groupId: true,
      fixtureId: true,
    },
  });

  if (!groupFixtures.length) {
    log.debug("No group fixtures found");
    return { settled: 0, skipped: 0, groupsEnded: 0 };
  }

  // Build groupFixture map (groupFixtureId -> fixtureId)
  const groupFixtureMap = new Map(
    groupFixtures.map((gf) => [gf.id, gf.fixtureId])
  );

  // Build groupId map (groupFixtureId -> groupId)
  const groupIdMap = new Map(groupFixtures.map((gf) => [gf.id, gf.groupId]));

  log.debug(
    { groupFixtureCount: groupFixtures.length },
    "Loaded group fixtures"
  );

  // Step 3: Load scoring rules
  const uniqueGroupIds = Array.from(
    new Set(groupFixtures.map((gf) => gf.groupId))
  );

  const groupRules = await prisma.groupRules.findMany({
    where: {
      groupId: { in: uniqueGroupIds },
    },
    select: {
      groupId: true,
      predictionMode: true,
      onTheNosePoints: true,
      correctDifferencePoints: true,
      outcomePoints: true,
      koRoundMode: true,
    },
  });

  // Build rules map (include koRoundMode for KO scoring: FullTime / ExtraTime / Penalties)
  const rulesMap = new Map(
    groupRules.map((r) => [
      r.groupId,
      {
        predictionMode: r.predictionMode as "CorrectScore" | "MatchWinner",
        onTheNosePoints: r.onTheNosePoints,
        correctDifferencePoints: r.correctDifferencePoints,
        outcomePoints: r.outcomePoints,
        koRoundMode: r.koRoundMode as "FullTime" | "ExtraTime" | "Penalties",
      } as ScoringRules,
    ])
  );

  log.debug({ rulesCount: groupRules.length }, "Loaded scoring rules");

  // Step 4: Load unsettled predictions
  const groupFixtureIds = groupFixtures.map((gf) => gf.id);

  const predictions = await prisma.groupPredictions.findMany({
    where: {
      groupFixtureId: { in: groupFixtureIds },
      settledAt: null,
    },
    select: {
      id: true,
      groupId: true,
      groupFixtureId: true,
      prediction: true,
    },
  });

  if (!predictions.length) {
    log.debug("No unsettled predictions found");
    return { settled: 0, skipped: 0, groupsEnded: 0 };
  }

  log.info(
    { predictionCount: predictions.length },
    "Loaded unsettled predictions"
  );

  // Step 5: Calculate scores
  const updates: Array<{
    id: number;
    points: string;
    winningCorrectScore: boolean;
    winningMatchWinner: boolean;
  }> = [];

  let skipped = 0;

  for (const pred of predictions) {
    // Get fixture ID from groupFixture map
    const fixtureId = groupFixtureMap.get(pred.groupFixtureId);
    if (!fixtureId) {
      log.warn({ predictionId: pred.id }, "Missing fixture ID for prediction");
      skipped++;
      continue;
    }

    // Get fixture from fixture map
    const fixture = fixtureMap.get(fixtureId);
    if (!fixture) {
      log.warn(
        { predictionId: pred.id, fixtureId },
        "Missing fixture for prediction"
      );
      skipped++;
      continue;
    }

    // Resolve scores: use homeScore90/awayScore90 (primary), or parse from result string when null (safety net)
    let homeScore90 = fixture.homeScore90;
    let awayScore90 = fixture.awayScore90;
    if (homeScore90 == null || awayScore90 == null) {
      if (fixture.result?.trim()) {
        const parsed = parseScores(fixture.result);
        if (parsed.homeScore != null && parsed.awayScore != null) {
          homeScore90 = parsed.homeScore;
          awayScore90 = parsed.awayScore;
        }
      }
      if (homeScore90 == null || awayScore90 == null) {
        log.warn(
          { predictionId: pred.id, fixtureId },
          "Fixture has null scores"
        );
        skipped++;
        continue;
      }
    }

    // Get rules from rules map
    const rules = rulesMap.get(pred.groupId);
    if (!rules) {
      log.warn(
        { predictionId: pred.id, groupId: pred.groupId },
        "Missing rules for group"
      );
      skipped++;
      continue;
    }

    // Build full fixture result for scoring (homeScore90/awayScore90 primary; ET/PEN optional)
    const fixtureResult = {
      homeScore90,
      awayScore90,
      state: fixture.state,
      homeScoreET: fixture.homeScoreET ?? null,
      awayScoreET: fixture.awayScoreET ?? null,
      penHome: fixture.penHome ?? null,
      penAway: fixture.penAway ?? null,
    };

    // Calculate score (scoring engine uses koRoundMode and period scores internally)
    const result = calculateScore(
      { prediction: pred.prediction },
      fixtureResult,
      rules
    );

    updates.push({
      id: pred.id,
      points: String(result.points),
      winningCorrectScore: result.winningCorrectScore,
      winningMatchWinner: result.winningMatchWinner,
    });
  }

  if (!updates.length) {
    log.info({ skipped }, "No predictions to settle");
    return { settled: 0, skipped, groupsEnded: 0 };
  }

  // Snapshot rankings before settlement for ranking_change events
  const groupsWithCreator = await prisma.groups.findMany({
    where: { id: { in: uniqueGroupIds } },
    select: { id: true, creatorId: true },
  });
  const rankingsBefore = new Map<number, Map<number, number>>();
  const beforeResults = await Promise.allSettled(
    groupsWithCreator.map((g) => getGroupRanking(g.id, g.creatorId))
  );
  groupsWithCreator.forEach((g, i) => {
    const result = beforeResults[i]!;
    if (result.status === "fulfilled") {
      const rankMap = new Map<number, number>();
      for (const item of result.value.data) {
        rankMap.set(item.userId, item.rank);
      }
      rankingsBefore.set(g.id, rankMap);
    } else {
      log.warn(
        { groupId: g.id, err: result.reason },
        "Failed to snapshot ranking before settlement"
      );
    }
  });

  // Step 6: Batch update in transaction
  const now = new Date();

  try {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.groupPredictions.update({
          where: { id: update.id },
          data: {
            points: update.points,
            winningCorrectScore: update.winningCorrectScore,
            winningMatchWinner: update.winningMatchWinner,
            settledAt: now,
          },
        })
      )
    );

    // Step 7: Transition completed groups to "ended"
    const groupsEnded = await transitionCompletedGroups(uniqueGroupIds);

    // Detect ranking changes and emit ranking_change chat events (top 3 only)
    const afterResults = await Promise.allSettled(
      groupsWithCreator.map((g) => getGroupRanking(g.id, g.creatorId))
    );
    for (const [i, g] of groupsWithCreator.entries()) {
      const afterResult = afterResults[i]!;
      if (afterResult.status === "rejected") {
        log.warn(
          { groupId: g.id, err: afterResult.reason },
          "Failed to fetch ranking after settlement"
        );
        continue;
      }

      const before = rankingsBefore.get(g.id);
      if (!before) continue;

      const after = afterResult.value;

      for (const item of after.data) {
        const prevRank = before.get(item.userId);
        if (
          prevRank !== undefined &&
          item.rank < prevRank &&
          item.rank <= 3
        ) {
          await emitSystemEvent(
            g.id,
            "ranking_change",
            {
              userId: item.userId,
              username: item.username || "Someone",
              oldPosition: prevRank,
              newPosition: item.rank,
            },
            io
          );
        }
      }

      // Detect leader change
      const beforeLeader = [...(before?.entries() ?? [])]
        .filter(([, rank]) => rank === 1)
        .map(([userId]) => userId);

      const afterRanking = after.data.filter((item) => item.rank === 1);
      const newLeader = afterRanking[0];

      // Emit only if: single new leader AND different from before
      if (
        afterRanking.length === 1 &&
        newLeader &&
        !beforeLeader.includes(newLeader.userId)
      ) {
        await emitSystemEvent(
          g.id,
          "leader_change",
          {
            userId: newLeader.userId,
            username: newLeader.username || "Someone",
          },
          io
        );
      }
    }

    log.info(
      { settled: updates.length, skipped, groupsEnded },
      "Settlement completed successfully"
    );
    return { settled: updates.length, skipped, groupsEnded };
  } catch (error) {
    log.error(
      { error, updateCount: updates.length },
      "Failed to settle predictions"
    );
    throw error;
  }
}

/**
 * Transition groups to "ended" when all their fixtures are in a terminal state
 * (FT = finished, CAN = cancelled, INT = interrupted).
 * Only affects groups that are currently "active".
 *
 * @param groupIds - Group IDs to check (typically those touched by settlement)
 * @returns Number of groups transitioned to ended
 */
async function transitionCompletedGroups(groupIds: number[]): Promise<number> {
  if (!groupIds.length) return 0;

  // Single query: find groups that still have non-terminal fixtures
  const groupsWithPending = await prisma.groupFixtures.groupBy({
    by: ["groupId"],
    where: {
      groupId: { in: groupIds },
      fixtures: {
        state: {
          notIn: [...FINISHED_STATES, ...CANCELLED_STATES] as FixtureState[],
        },
      },
    },
  });

  const pendingGroupIds = new Set(groupsWithPending.map((g) => g.groupId));
  const completedGroupIds = groupIds.filter((id) => !pendingGroupIds.has(id));

  if (!completedGroupIds.length) return 0;

  const { count: ended } = await prisma.groups.updateMany({
    where: { id: { in: completedGroupIds }, status: "active" },
    data: { status: "ended" },
  });

  for (const groupId of completedGroupIds) {
    log.info({ groupId }, "Group transitioned to ended");
  }

  return ended;
}
