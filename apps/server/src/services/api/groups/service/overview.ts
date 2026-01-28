// groups/service/overview.ts
// Predictions overview service.

import type {
  PredictionsOverviewResponse,
} from "../types";
import {
  buildParticipants,
  buildOverviewFixtures,
  buildPredictionsMap,
  hasMatchStarted,
} from "../helpers";
import { assertGroupMember } from "../permissions";
import { repository as repo } from "../repository";

/**
 * Get predictions overview for a group.
 * - Verifies that the user is a group member (creator or joined).
 * - Returns all participants, fixtures, and predictions in a structured format.
 */
export async function getPredictionsOverview(
  groupId: number,
  userId: number
): Promise<PredictionsOverviewResponse> {
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

  // Build predictions map
  const predictionsMap = buildPredictionsMap(predictions, userId, fixtures);

  // Initialize all possible combinations with null (for missing predictions)
  // Only for current user OR for matches that have started
  const fixtureStartedMap = new Map(
    fixtures.map((f) => [f.id, hasMatchStarted(f)])
  );
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
      }
    }
  }

  return {
    status: "success",
    data: {
      participants,
      fixtures,
      predictions: predictionsMap,
    },
    message: "Predictions overview fetched successfully",
  };
}
