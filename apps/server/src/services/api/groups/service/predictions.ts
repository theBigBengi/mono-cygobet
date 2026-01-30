// groups/service/predictions.ts
// Prediction services (saveGroupPrediction, saveGroupPredictionsBatch).

import { BadRequestError, NotFoundError } from "../../../../utils/errors";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { validateFixtureIdsBelongToGroup } from "../validators/group-validators";
import { getLogger } from "../../../../logger";
import { hasMatchStarted } from "../helpers";

const log = getLogger("groups.predictions");

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
  log.debug({ groupId, fixtureId, userId, prediction }, "saveGroupPrediction - start");
  await assertGroupMember(groupId, userId);

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
    throw new BadRequestError("Cannot save prediction after the match has started");
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
 * - Updates all predictions in a single transaction.
 */
export async function saveGroupPredictionsBatch(
  groupId: number,
  userId: number,
  predictions: Array<{ fixtureId: number; home: number; away: number }>
): Promise<{ status: "success"; message: string }> {
  log.debug({ groupId, userId, count: predictions.length }, "saveGroupPredictionsBatch - start");
  if (predictions.length === 0) {
    log.info({ groupId, userId }, "saveGroupPredictionsBatch - no predictions");
    return {
      status: "success",
      message: "No predictions to save",
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

  // Check that none of the fixtures have started
  const startedFixtures = await repo.findStartedFixturesByGroupFixtureIds(
    groupFixtures.map((gf) => gf.id)
  );
  if (startedFixtures.length > 0) {
    throw new BadRequestError(
      "Cannot save predictions for matches that have already started"
    );
  }

  // Create a map of fixtureId -> groupFixtureId for quick lookup
  const fixtureIdToGroupFixtureId = new Map(
    groupFixtures.map((gf) => [gf.fixtureId, gf.id])
  );

  // Prepare predictions for batch upsert
  const predictionsToUpsert = predictions.map((pred) => {
    const groupFixtureId = fixtureIdToGroupFixtureId.get(pred.fixtureId);
    if (!groupFixtureId) {
      throw new NotFoundError(
        `Group fixture not found for fixture ${pred.fixtureId}`
      );
    }

    const predictionString = `${pred.home}:${pred.away}`;

    return {
      groupFixtureId,
      prediction: predictionString,
    };
  });

  // Update all predictions in a single transaction
  await repo.upsertGroupPredictionsBatch(groupId, userId, predictionsToUpsert);
  log.info({ groupId, userId, count: predictions.length }, "saveGroupPredictionsBatch - success");
  return {
    status: "success",
    message: `${predictions.length} prediction(s) saved successfully`,
  };
}
