// groups/service/settlement.ts
// Settlement service for calculating points on finished fixtures.

import { prisma } from "@repo/db";
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
 * 1. Load FT fixtures
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

  // Step 1: Load FT fixtures (including period scores for KO scoring)
  const fixtures = await prisma.fixtures.findMany({
    where: {
      id: { in: fixtureIds },
      state: "FT",
    },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
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
    log.debug("No FT fixtures found");
    return { settled: 0, skipped: 0, groupsEnded: 0 };
  }

  // Build fixture map
  const fixtureMap = new Map(
    fixtures.map((f) => [f.id, f])
  );

  log.debug({ fixtureCount: fixtures.length }, "Loaded FT fixtures");

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
  const groupIdMap = new Map(
    groupFixtures.map((gf) => [gf.id, gf.groupId])
  );

  log.debug({ groupFixtureCount: groupFixtures.length }, "Loaded group fixtures");

  // Step 3: Load scoring rules
  const uniqueGroupIds = Array.from(new Set(groupFixtures.map((gf) => gf.groupId)));
  
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

  log.info({ predictionCount: predictions.length }, "Loaded unsettled predictions");

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
      log.warn({ predictionId: pred.id, fixtureId }, "Missing fixture for prediction");
      skipped++;
      continue;
    }

    // Resolve final scores: use DB values, or parse from result string when null (safety net)
    let homeScore = fixture.homeScore;
    let awayScore = fixture.awayScore;
    if (homeScore == null || awayScore == null) {
      if (fixture.result?.trim()) {
        const parsed = parseScores(fixture.result);
        if (parsed.homeScore != null && parsed.awayScore != null) {
          homeScore = parsed.homeScore;
          awayScore = parsed.awayScore;
        }
      }
      if (homeScore == null || awayScore == null) {
        log.warn({ predictionId: pred.id, fixtureId }, "Fixture has null scores");
        skipped++;
        continue;
      }
    }

    // Get rules from rules map
    const rules = rulesMap.get(pred.groupId);
    if (!rules) {
      log.warn({ predictionId: pred.id, groupId: pred.groupId }, "Missing rules for group");
      skipped++;
      continue;
    }

    // Build full fixture result for scoring (period scores used by koRoundMode; null for non-ET matches)
    const fixtureResult = {
      homeScore,
      awayScore,
      state: fixture.state,
      homeScore90: fixture.homeScore90 ?? null,
      awayScore90: fixture.awayScore90 ?? null,
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
  for (const g of groupsWithCreator) {
    try {
      const ranking = await getGroupRanking(g.id, g.creatorId);
      const rankMap = new Map<number, number>();
      for (const item of ranking.data) {
        rankMap.set(item.userId, item.rank);
      }
      rankingsBefore.set(g.id, rankMap);
    } catch {
      // Skip if ranking fails
    }
  }

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
    for (const g of groupsWithCreator) {
      try {
        const before = rankingsBefore.get(g.id);
        if (!before) continue;

        const after = await getGroupRanking(g.id, g.creatorId);

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
      } catch {
        // Don't fail settlement if ranking events fail
      }
    }

    log.info({ settled: updates.length, skipped, groupsEnded }, "Settlement completed successfully");
    return { settled: updates.length, skipped, groupsEnded };
  } catch (error) {
    log.error({ error, updateCount: updates.length }, "Failed to settle predictions");
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
  let ended = 0;
  for (const groupId of groupIds) {
    // Count group fixtures whose matches are not yet terminal
    const nonTerminalCount = await prisma.groupFixtures.count({
      where: {
        groupId,
        fixtures: { state: { notIn: ["FT", "CAN", "INT"] } },
      },
    });
    if (nonTerminalCount === 0) {
      await prisma.groups.updateMany({
        where: { id: groupId, status: "active" },
        data: { status: "ended" },
      });
      ended++;
      log.info({ groupId }, "Group transitioned to ended");
    }
  }
  return ended;
}
