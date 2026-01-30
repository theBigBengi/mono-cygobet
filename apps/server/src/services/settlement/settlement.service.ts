/**
 * Settlement service — orchestrates scoring and closing of predictions for finished fixtures.
 *
 * Flow:
 * 1. Find unsettled predictions for FT fixtures
 * 2. Load group scoring rules for each unique groupId
 * 3. Score each prediction (pure logic)
 * 4. Save all updates in a single transaction (idempotent: only unsettled are selected)
 */

import type { GroupsRepository } from "../api/groups/repository/interface";
import { scorePrediction } from "../api/groups/scoring/score-prediction";
import type { PredictionScore, ScoringRules } from "../api/groups/scoring/score-prediction";

const DEFAULT_RULES: ScoringRules = {
  onTheNosePoints: 3,
  correctDifferencePoints: 2,
  outcomePoints: 1,
};

/**
 * Predictions are always stored as "home:away" (e.g. "2:1") in our API/DB.
 * We only accept ":" here to match that single convention.
 */
function parsePredictionScore(s: string): PredictionScore | null {
  const parts = s.trim().split(":");
  if (parts.length !== 2) return null;
  const home = Number(parts[0]);
  const away = Number(parts[1]);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  return { home, away };
}

/**
 * Fixture results may be "x-y" (normalized by finished-fixtures job) or "x:y" (from provider).
 * We accept both separators so we handle stored results and any legacy/edge data consistently.
 */
function parseResultScore(
  resultStr: string,
  homeScore: number | null,
  awayScore: number | null
): PredictionScore | null {
  if (homeScore !== null && awayScore !== null) return { home: homeScore, away: awayScore };
  const match = resultStr.trim().match(/^(\d+)[-:](\d+)$/);
  if (!match) return null;
  const home = Number(match[1]);
  const away = Number(match[2]);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  return { home, away };
}

export type RunSettlementResult = {
  processed: number;
  skipped: number;
};

/**
 * Run settlement: find unsettled predictions for finished fixtures, score them, persist in one transaction.
 * Idempotent: only rows with settledAt = null are selected; after update they have settledAt set.
 */
export async function runSettlement(
  repo: GroupsRepository
): Promise<RunSettlementResult> {
  const rows = await repo.findUnsettledPredictionsForFinishedFixtures();
  if (rows.length === 0) {
    return { processed: 0, skipped: 0 };
  }

  const groupIds = [...new Set(rows.map((r) => r.groupId))];
  const rulesByGroupId = new Map<number, ScoringRules>();
  for (const gid of groupIds) {
    const rules = await repo.findGroupRulesWithScoring(gid);
    rulesByGroupId.set(gid, rules ?? DEFAULT_RULES);
  }

  const updates: Array<{
    id: number;
    points: number;
    winningCorrectScore: boolean;
    winningMatchWinner: boolean;
  }> = [];
  let skipped = 0;

  for (const row of rows) {
    const predScore = parsePredictionScore(row.prediction);
    const resultScore = parseResultScore(
      row.fixtureResult,
      row.fixtureHomeScore,
      row.fixtureAwayScore
    );
    if (!predScore || !resultScore) {
      skipped++;
      continue;
    }
    const rules = rulesByGroupId.get(row.groupId) ?? DEFAULT_RULES;
    const scoreResult = scorePrediction(predScore, resultScore, rules);
    updates.push({
      id: row.id,
      points: scoreResult.points,
      winningCorrectScore: scoreResult.exactResult,
      winningMatchWinner: scoreResult.correctWinnerOrDraw,
    });
  }

  await repo.settleGroupPredictionsBatch(updates);
  return { processed: updates.length, skipped };
}
