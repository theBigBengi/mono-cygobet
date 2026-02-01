// groups/service/overview.ts
// Predictions overview service.

import type {
  PredictionsOverviewResponse,
} from "../types";
import type { PredictionForOverview } from "../repository/predictions";
import {
  buildParticipants,
  buildOverviewFixtures,
  buildPredictionsMap,
} from "../helpers";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";
import { getLogger } from "../../../../logger";

const log = getLogger("groups.overview");

/**
 * Get predictions overview for a group.
 * - Verifies that the user is a group member (creator or joined).
 * - Returns all participants, fixtures, and predictions in a structured format.
 */
export async function getPredictionsOverview(
  groupId: number,
  userId: number
): Promise<PredictionsOverviewResponse> {
  log.debug({ groupId, userId }, "getPredictionsOverview - start");
  await assertGroupMember(groupId, userId);

  // Fetch data in parallel for better performance
  const [membersWithUsers, groupFixtures, predictions] = await Promise.all([
    repo.findGroupMembersWithUsers(groupId),
    repo.findGroupFixturesForOverview(groupId),
    repo.findPredictionsForOverview(groupId),
  ]);

  // Build participants and fixtures using pure functions
  const participants = buildParticipants(membersWithUsers);
  const fixtures = buildOverviewFixtures(groupFixtures);

  // Build predictions map and prediction points map
  const { predictionsMap, predictionPointsMap, fixtureStartedMap } =
    buildPredictionsMap(predictions as PredictionForOverview[], userId, fixtures);

  // Initialize all possible combinations with null (for missing predictions)
  // Only for current user OR for matches that have started
  for (const participant of participants) {
    for (const fixture of fixtures) {
      const key = `${participant.id}_${fixture.id}`;
      const hasStarted = fixtureStartedMap.get(fixture.id) ?? false;

      // Only initialize if:
      // 1. It's the current user (always show)
      // 2. OR the match has started (show all users)
      if (participant.id === userId || hasStarted) {
        if (!(key in predictionsMap)) {
          predictionsMap[key] = null;
        }
        if (!(key in predictionPointsMap)) {
          predictionPointsMap[key] = null;
        }
      }
    }
  }

  // Compute total points per participant
  const participantsWithTotals = participants.map((p) => {
    let total = 0;
    for (const fixture of fixtures) {
      const key = `${p.id}_${fixture.id}`;
      const pts = predictionPointsMap[key];
      if (pts !== null && pts !== undefined) {
        total += parseInt(pts, 10) || 0;
      }
    }
    return { ...p, totalPoints: total };
  });

  // Sort by total points (high to low), then by username (tie-break)
  const sorted = [...participantsWithTotals].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    const nameA = (a.username ?? "").toLowerCase();
    const nameB = (b.username ?? "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Re-assign number (rank) 1, 2, 3...
  const participantsRanked = sorted.map((p, index) => ({
    ...p,
    number: index + 1,
  }));

  return {
    status: "success",
    data: {
      participants: participantsRanked,
      fixtures,
      predictions: predictionsMap,
      predictionPoints: predictionPointsMap,
    },
    message: "Predictions overview fetched successfully",
  };
}
