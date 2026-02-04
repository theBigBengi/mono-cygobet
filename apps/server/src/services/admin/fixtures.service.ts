// admin/fixtures.service.ts
// Resettle and settlement summary for admin fixture management.

import { prisma } from "@repo/db";
import type {
  AdminFixtureResettleResponse,
  AdminFixtureGroupsSummaryResponse,
} from "@repo/types";
import { settlePredictionsForFixtures } from "../api/groups/service/settlement";

/**
 * Re-settle predictions for a single FT fixture.
 * Loads fixture, verifies state is FT, counts groups containing it,
 * runs settlement, returns counts.
 */
export async function resettleFixture(
  fixtureId: number
): Promise<AdminFixtureResettleResponse> {
  const fixture = await prisma.fixtures.findUnique({
    where: { id: fixtureId },
    select: { id: true, state: true },
  });

  if (!fixture) {
    const err = new Error("Fixture not found") as Error & {
      statusCode?: number;
    };
    err.statusCode = 404;
    throw err;
  }

  if (fixture.state !== "FT") {
    const err = new Error("Fixture must be FT to resettle") as Error & {
      statusCode?: number;
    };
    err.statusCode = 400;
    throw err;
  }

  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId },
    select: { groupId: true },
  });
  const groupsAffected = new Set(groupFixtures.map((gf) => gf.groupId)).size;

  const result = await settlePredictionsForFixtures([fixtureId]);

  return {
    groupsAffected,
    predictionsRecalculated: result.settled,
  };
}

/**
 * Get groups summary for a fixture: aggregate counts across all groups containing it.
 */
export async function getGroupsSummary(
  fixtureId: number
): Promise<AdminFixtureGroupsSummaryResponse> {
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId },
    select: { id: true },
  });

  if (!groupFixtures.length) {
    return {
      totalGroups: 0,
      totalPredictions: 0,
      settledPredictions: 0,
      unsettledPredictions: 0,
    };
  }

  const totalGroups = groupFixtures.length;
  const groupFixtureIds = groupFixtures.map((gf) => gf.id);

  const [totalPredictions, settledPredictions] = await Promise.all([
    prisma.groupPredictions.count({
      where: { groupFixtureId: { in: groupFixtureIds } },
    }),
    prisma.groupPredictions.count({
      where: {
        groupFixtureId: { in: groupFixtureIds },
        settledAt: { not: null },
      },
    }),
  ]);

  return {
    totalGroups,
    totalPredictions,
    settledPredictions,
    unsettledPredictions: totalPredictions - settledPredictions,
  };
}
