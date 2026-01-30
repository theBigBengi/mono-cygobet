// groups/helpers.ts
// Helper functions for groups service to reduce code duplication and improve maintainability.

import type { ApiFixturesListResponse, ApiGroupPrivacy } from "@repo/types";
import type { ApiGroupItem } from "@repo/types";
import type {
  FixtureWithRelations,
  PredictionRow,
  ParsedPrediction,
} from "./types";
import { nowUnixSeconds } from "../../../utils/dates";

// Types
import { GROUP_STATUS } from "./constants";

export type GroupStatus =
  | typeof GROUP_STATUS.DRAFT
  | typeof GROUP_STATUS.ACTIVE
  | typeof GROUP_STATUS.ENDED;

// Re-export types for convenience
export type { ParsedPrediction } from "./types";


/**
 * Resolve group name - pure function.
 * Use provided name or generate automatic name from username and draft count.
 */
export function resolveGroupName(
  name: string | undefined,
  username: string,
  draftCount: number
): string {
  if (name && typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return `${username} Draft #${draftCount + 1}`;
}


/**
 * Parse a prediction string and row data into a structured format.
 *
 * @param predictionString - Prediction string in format "home:away" (e.g., "2:1")
 * @param predictionRow - Optional prediction row with metadata
 * @returns Parsed prediction object, or null if parsing fails
 */
export function parsePrediction(
  predictionString: string | null | undefined,
  predictionRow?: PredictionRow | null
): ParsedPrediction | null {
  if (!predictionString || !predictionRow) return null;

  // Parse prediction string format "home:away" (e.g., "2:1")
  const parts = predictionString.split(":");
  if (parts.length !== 2) return null;

  const home = Number(parts[0]);
  const away = Number(parts[1]);

  if (isNaN(home) || isNaN(away)) return null;

  // Parse points from database (can be stored as string or number)
  const pointsValue = predictionRow.points;
  const points =
    pointsValue !== null && pointsValue !== undefined
      ? typeof pointsValue === "string"
        ? parseInt(pointsValue, 10)
        : typeof pointsValue === "number"
          ? pointsValue
          : null
      : null;

  return {
    home,
    away,
    updatedAt: predictionRow.updatedAt.toISOString(),
    placedAt: predictionRow.placedAt.toISOString(),
    settled: predictionRow.settledAt != null,
    points: points !== null && !isNaN(points) ? points : null,
  };
}

/**
 * Build participants array for predictions overview (pure function).
 *
 * @param membersWithUsers - Members and users data from repository
 * @returns Array of participants with id, username, and number
 */
export function buildParticipants(membersWithUsers: {
  members: Array<{ userId: number }>;
  users: Array<{ id: number; username: string | null }>;
}) {
  const { members, users } = membersWithUsers;
  const userMap = new Map(users.map((u) => [u.id, u.username]));

  return members.map((member, index) => ({
    id: member.userId,
    username: userMap.get(member.userId) ?? null,
    number: index + 1,
  }));
}

/**
 * Build fixtures array for predictions overview (pure function).
 *
 * @param groupFixtures - Group fixtures data from repository
 * @returns Array of fixtures with teams and result
 */
export function buildOverviewFixtures(
  groupFixtures: Array<{
    fixtureId: number;
    fixtures: {
      id: number;
      name: string;
      startTs: number;
      state: string;
      result: string | null;
      homeTeam: {
        id: number;
        name: string;
        imagePath: string | null;
      } | null;
      awayTeam: {
        id: number;
        name: string;
        imagePath: string | null;
      } | null;
    } | null;
  }>
) {
  return groupFixtures.map(({ fixtures }) => {
    if (!fixtures || !fixtures.homeTeam || !fixtures.awayTeam) {
      throw new Error("Invalid fixture data");
    }
    return {
      id: fixtures.id,
      name: fixtures.name,
      homeTeam: {
        id: fixtures.homeTeam.id,
        name: fixtures.homeTeam.name,
        imagePath: fixtures.homeTeam.imagePath,
      },
      awayTeam: {
        id: fixtures.awayTeam.id,
        name: fixtures.awayTeam.name,
        imagePath: fixtures.awayTeam.imagePath,
      },
      result: fixtures.result,
      startTs: fixtures.startTs,
      state: String(fixtures.state),
    };
  });
}

/** States where the match hasn't actually started playing */
const NON_STARTED_STATES = new Set([
  "NS",
  "TBD",
  "PST",
  "POSTP",
  "CANC",
  "CANCELLED",
  "ABD",
  "SUSP",
]);

/**
 * Check if a match has started based on result, start time, and state.
 *
 * @param fixture - Fixture data
 * @returns true if match has started, false otherwise
 */
export function hasMatchStarted(fixture: {
  result: string | null;
  startTs: number;
  state: string;
}): boolean {
  // If there's a result, match has definitely finished (and started)
  if (fixture.result) return true;
  // Check if start time is in the past
  const now = nowUnixSeconds();
  if (fixture.startTs > now) return false;
  return !NON_STARTED_STATES.has(fixture.state);
}

/**
 * Build predictions map for predictions overview (pure function).
 *
 * @param predictions - Predictions data from repository
 * @param userId - The ID of the current user
 * @param fixtures - Array of fixtures
 * @returns predictionsMap keyed by `${userId}_${fixtureId}` and fixtureStartedMap
 */
export function buildPredictionsMap(
  predictions: Array<{
    userId: number;
    groupFixtureId: number;
    prediction: string;
    groupFixtures: {
      fixtureId: number;
    };
  }>,
  userId: number,
  fixtures: Array<{
    id: number;
    result: string | null;
    startTs: number;
    state: string;
  }>
): { predictionsMap: Record<string, string | null>; fixtureStartedMap: Map<number, boolean> } {
  // Create a map of fixtureId -> hasStarted for quick lookup
  const fixtureStartedMap = new Map(
    fixtures.map((f) => [f.id, hasMatchStarted(f)])
  );

  // Build predictions map: `${userId}_${fixtureId}` -> "home:away"
  const predictionsMap: Record<string, string | null> = {};
  for (const pred of predictions) {
    const fixtureId = pred.groupFixtures.fixtureId;
    const key = `${pred.userId}_${fixtureId}`;
    const hasStarted = fixtureStartedMap.get(fixtureId) ?? false;

    // Include prediction if:
    // 1. It's the current user's prediction (always show)
    // 2. OR the match has started (show all users' predictions)
    if (pred.userId === userId || hasStarted) {
      predictionsMap[key] = pred.prediction;
    }
  }

  return { predictionsMap, fixtureStartedMap };
}
