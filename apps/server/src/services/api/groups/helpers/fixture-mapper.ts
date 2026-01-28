// groups/helpers/fixture-mapper.ts
// Shared fixture mapping logic - converts GroupFixtureWithPredictions[] to ApiFixture[].

import type { ApiFixturesListResponse } from "@repo/types";
import { parsePrediction } from "../helpers";
import { formatFixtureFromDb } from "../builders";
import type { FixtureWithRelationsAndResult } from "../types";

/**
 * Type for group fixture with predictions - matches repository interface return type.
 */
type GroupFixtureWithPredictions = {
  id: number;
  fixtures: FixtureWithRelationsAndResult;
  groupPredictions: Array<{
    prediction: string;
    updatedAt: Date;
    placedAt: Date;
    settledAt: Date | null;
    points: number | string | null;
  }>;
};

/**
 * Map group fixtures with predictions to API fixtures format.
 * Pure function - no DB access, no error throwing.
 * Filters out null/undefined results.
 *
 * @param rows - Group fixtures with predictions from repository
 * @param userId - User ID (currently not used but kept for consistency)
 * @returns Array of formatted fixtures for API response
 */
export function mapGroupFixturesToApiFixtures(
  rows: GroupFixtureWithPredictions[],
  userId: number
): ApiFixturesListResponse["data"] {
  return rows
    .map((row) => {
      const predictionRow =
        row.groupPredictions && row.groupPredictions.length > 0
          ? row.groupPredictions[0]
          : null;
      const prediction = parsePrediction(
        predictionRow?.prediction ?? null,
        predictionRow
      );
      // Service layer decides: use result from fixture, or null if not available
      // Minimal type assertion: Prisma's type inference doesn't narrow nested selects perfectly
      return formatFixtureFromDb(
        row.fixtures as FixtureWithRelationsAndResult,
        prediction,
        row.fixtures.result ?? null
      );
    })
    .filter(
      (
        fixture: ApiFixturesListResponse["data"][0] | null
      ): fixture is NonNullable<typeof fixture> => fixture !== null
    );
}
