// groups/service/predictions.ts
// Prediction services (saveGroupPrediction, saveGroupPredictionsBatch).

import { NotFoundError } from "../../../../utils/errors";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";

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

  // Format prediction as string "home:away" (e.g., "2:1")
  const predictionString = `${prediction.home}:${prediction.away}`;

  // Upsert prediction
  await repo.upsertGroupPrediction({
    userId,
    groupFixtureId: groupFixture.id,
    groupId,
    prediction: predictionString,
  });

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
  if (predictions.length === 0) {
    return {
      status: "success",
      message: "No predictions to save",
    };
  }

  // Verify user is a group member (removes duplicate validation)
  await assertGroupMember(groupId, userId);

  // Get all fixtures and verify they belong to the group
  const fixtureIds = predictions.map((p) => p.fixtureId);
  const groupFixtures = await repo.findGroupFixturesByFixtureIds(
    groupId,
    fixtureIds
  );

  if (groupFixtures.length !== fixtureIds.length) {
    throw new NotFoundError(
      `One or more fixtures do not belong to group ${groupId}`
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

  return {
    status: "success",
    message: `${predictions.length} prediction(s) saved successfully`,
  };
}
