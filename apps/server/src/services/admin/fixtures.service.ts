// admin/fixtures.service.ts
// Resettle and settlement summary for admin fixture management.

import { prisma } from "@repo/db";
import type {
  AdminFixtureResettleResponse,
  AdminFixtureSettlementSummaryResponse,
  AdminFixtureSettlementGroup,
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
    const err = new Error("Fixture not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  if (fixture.state !== "FT") {
    const err = new Error(
      "Fixture must be FT to resettle"
    ) as Error & { statusCode?: number };
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
 * Get settlement summary for a fixture: groups containing it and settled prediction counts.
 */
export async function getSettlementSummary(
  fixtureId: number
): Promise<AdminFixtureSettlementSummaryResponse> {
  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId },
    select: {
      id: true,
      groupId: true,
      groups: {
        select: { id: true, name: true },
      },
    },
  });

  if (!groupFixtures.length) {
    return { groups: [] };
  }

  const groupFixtureIds = groupFixtures.map((gf) => gf.id);
  const settledCounts = await prisma.groupPredictions.groupBy({
    by: ["groupId"],
    where: {
      groupFixtureId: { in: groupFixtureIds },
      settledAt: { not: null },
    },
    _count: { id: true },
  });

  const countByGroup = new Map(
    settledCounts.map((s) => [s.groupId, s._count.id])
  );

  const groups: AdminFixtureSettlementGroup[] = groupFixtures.map((gf) => ({
    groupId: gf.groups.id,
    groupName: gf.groups.name,
    predictionsSettled: countByGroup.get(gf.groupId) ?? 0,
  }));

  return { groups };
}
