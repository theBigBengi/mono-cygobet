// fixtures/repository.ts
// Repository layer for fixtures - fixture-related database queries.
// Receives pre-built where conditions, does NOT build them.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";

/**
 * Find fixtures by where condition (generic).
 */
export async function findFixtures(
  where: Prisma.fixturesWhereInput,
  select?: Prisma.fixturesSelect,
  orderBy?: Prisma.fixturesOrderByWithRelationInput | Prisma.fixturesOrderByWithRelationInput[]
) {
  return await prisma.fixtures.findMany({
    where,
    select: select ?? { id: true },
    orderBy: orderBy ?? { startTs: "asc" },
  });
}

/**
 * Find fixtures by where condition (transaction version).
 */
export async function findFixturesTx(
  tx: Prisma.TransactionClient,
  where: Prisma.fixturesWhereInput,
  select?: Prisma.fixturesSelect,
  orderBy?: Prisma.fixturesOrderByWithRelationInput | Prisma.fixturesOrderByWithRelationInput[]
) {
  return await tx.fixtures.findMany({
    where,
    select: select ?? { id: true },
    orderBy: orderBy ?? { startTs: "asc" },
  });
}

/**
 * Find upcoming fixtures by league IDs.
 * @deprecated Use findFixtures with where condition built via Query Layer instead.
 * Kept for backward compatibility - will be updated by callers.
 */
export async function findUpcomingFixturesByLeagues(
  where: Prisma.fixturesWhereInput
) {
  return await findFixtures(where, { id: true }, { startTs: "asc" });
}

/**
 * Find upcoming fixtures by team IDs.
 * @deprecated Use findFixtures with where condition built via Query Layer instead.
 * Kept for backward compatibility - will be updated by callers.
 */
export async function findUpcomingFixturesByTeams(
  where: Prisma.fixturesWhereInput
) {
  return await findFixtures(where, { id: true }, { startTs: "asc" });
}

/**
 * Find upcoming fixtures by league IDs (transaction version).
 * @deprecated Use findFixturesTx with where condition built via Query Layer instead.
 * Kept for backward compatibility - will be updated by callers.
 */
export async function findUpcomingFixturesByLeaguesTx(
  tx: Prisma.TransactionClient,
  where: Prisma.fixturesWhereInput
) {
  return await findFixturesTx(tx, where, { id: true }, { startTs: "asc" });
}

/**
 * Find upcoming fixtures by team IDs (transaction version).
 * @deprecated Use findFixturesTx with where condition built via Query Layer instead.
 * Kept for backward compatibility - will be updated by callers.
 */
export async function findUpcomingFixturesByTeamsTx(
  tx: Prisma.TransactionClient,
  where: Prisma.fixturesWhereInput
) {
  return await findFixturesTx(tx, where, { id: true }, { startTs: "asc" });
}
