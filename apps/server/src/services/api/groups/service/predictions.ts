// groups/service/predictions.ts
// Prediction services (saveGroupPrediction, saveGroupPredictionsBatch).

import { BadRequestError, NotFoundError } from "../../../../utils/errors";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { validateFixtureIdsBelongToGroup } from "../validators/group-validators";
import { getLogger } from "../../../../logger";
import { hasMatchStarted } from "../helpers";
import { invalidateRankingCache } from "../../../../lib/cache-invalidation";

const log = getLogger("groups.predictions");

function validatePredictionScores(home: number, away: number): void {
  if (!Number.isInteger(home) || !Number.isInteger(away)) {
    throw new BadRequestError("Prediction scores must be integers");
  }
  if (home < 0 || home > 9 || away < 0 || away > 9) {
    throw new BadRequestError("Prediction scores must be between 0 and 9");
  }
}

/**
 * Save or update a group prediction for a specific fixture.
 * - Verifies that the user is a group member.
 * - Verifies that the fixture belongs to the group.
 * - Upserts the prediction record.
 */
export async function saveGroupPrediction(
  groupId: number,
  fixtureId: number,
  userId: number,
  prediction: { home: number; away: number }
): Promise<{ status: "success"; message: string }> {
  log.debug(
    { groupId, fixtureId, userId, prediction },
    "saveGroupPrediction - start"
  );
  await assertGroupMember(groupId, userId);
  validatePredictionScores(prediction.home, prediction.away);

  // Verify fixture belongs to group and get groupFixtureId
  const groupFixture = await repo.findGroupFixtureByGroupAndFixture(
    groupId,
    fixtureId
  );

  if (!groupFixture) {
    throw new NotFoundError(
      `Fixture ${fixtureId} does not belong to group ${groupId}`
    );
  }

  // Fetch fixture to check if match has started
  const fixture = await repo.findFixtureByGroupFixtureId(groupFixture.id);
  if (fixture && hasMatchStarted(fixture)) {
    throw new BadRequestError(
      "Cannot save prediction after the match has started"
    );
  }

  // Format prediction as string "home:away" (e.g., "2:1")
  const predictionString = `${prediction.home}:${prediction.away}`;

  // Upsert prediction
  await repo.upsertGroupPrediction({
    userId,
    groupFixtureId: groupFixture.id,
    groupId,
    prediction: predictionString,
  });
  await invalidateRankingCache([groupId]);
  log.info({ groupId, fixtureId, userId }, "saveGroupPrediction - success");
  return {
    status: "success",
    message: "Prediction saved successfully",
  };
}

/**
 * Save or update multiple group predictions in a batch.
 * - Verifies that the user is a group member.
 * - Verifies that all fixtures belong to the group.
 * - Per-prediction validation: predictions for matches that have started are rejected
 *   (not thrown) and reported in the response. Other predictions are saved.
 * - Returns saved and rejected arrays for the client to handle partial success.
 */
export async function saveGroupPredictionsBatch(
  groupId: number,
  userId: number,
  predictions: Array<{ fixtureId: number; home: number; away: number }>
): Promise<{
  status: "success";
  message: string;
  saved: Array<{ fixtureId: number }>;
  rejected: Array<{ fixtureId: number; reason: string }>;
}> {
  log.debug(
    { groupId, userId, count: predictions.length },
    "saveGroupPredictionsBatch - start"
  );
  if (predictions.length === 0) {
    log.info({ groupId, userId }, "saveGroupPredictionsBatch - no predictions");
    return {
      status: "success",
      message: "No predictions to save",
      saved: [],
      rejected: [],
    };
  }

  // Verify user is a group member (removes duplicate validation)
  await assertGroupMember(groupId, userId);

  // Get all fixtures and verify they belong to the group
  const fixtureIds = predictions.map((p) => p.fixtureId);
  const groupFixtures = await validateFixtureIdsBelongToGroup(
    groupId,
    fixtureIds,
    repo
  );

  // Build set of groupFixtureIds whose matches have started (per-prediction filtering)
  const startedFixtures = await repo.findStartedFixturesByGroupFixtureIds(
    groupFixtures.map((gf) => gf.id)
  );
  const startedGroupFixtureIds = new Set(startedFixtures.map((gf) => gf.id));

  // Create a map of fixtureId -> groupFixtureId for quick lookup
  const fixtureIdToGroupFixtureId = new Map(
    groupFixtures.map((gf) => [gf.fixtureId, gf.id])
  );

  // Split predictions into to-upsert vs rejected
  const predictionsToUpsert: Array<{
    groupFixtureId: number;
    prediction: string;
  }> = [];
  const saved: Array<{ fixtureId: number }> = [];
  const rejected: Array<{ fixtureId: number; reason: string }> = [];

  for (const pred of predictions) {
    validatePredictionScores(pred.home, pred.away);

    const groupFixtureId = fixtureIdToGroupFixtureId.get(pred.fixtureId);
    if (!groupFixtureId) {
      throw new NotFoundError(
        `Group fixture not found for fixture ${pred.fixtureId}`
      );
    }

    // Reject predictions for matches that have already started (kickoff passed)
    if (startedGroupFixtureIds.has(groupFixtureId)) {
      rejected.push({ fixtureId: pred.fixtureId, reason: "match_started" });
      continue;
    }

    const predictionString = `${pred.home}:${pred.away}`;
    predictionsToUpsert.push({ groupFixtureId, prediction: predictionString });
    saved.push({ fixtureId: pred.fixtureId });
  }

  // Update only non-rejected predictions in a single transaction
  if (predictionsToUpsert.length > 0) {
    await repo.upsertGroupPredictionsBatch(
      groupId,
      userId,
      predictionsToUpsert
    );
    await invalidateRankingCache([groupId]);
  }

  log.info(
    { groupId, userId, saved: saved.length, rejected: rejected.length },
    "saveGroupPredictionsBatch - success"
  );
  return {
    status: "success",
    message:
      rejected.length > 0
        ? `${saved.length} prediction(s) saved, ${rejected.length} rejected (match already started)`
        : `${saved.length} prediction(s) saved successfully`,
    saved,
    rejected,
  };
}
