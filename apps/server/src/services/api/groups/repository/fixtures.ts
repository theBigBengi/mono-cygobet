// groups/repository/fixtures.ts
// Repository functions for group fixtures.

import { prisma } from "@repo/db";
import type { Prisma } from "@repo/db";
import { findFixturesTx } from "../../fixtures/repository";
import {
  buildUpcomingFixturesWhere,
  buildFixturesByLeaguesWhere,
  buildFixturesByTeamsWhere,
} from "../../fixtures/queries";
import { FIXTURE_SELECT_WITH_RESULT } from "../../fixtures/selects";
import type { FixtureWithRelationsAndResult } from "../types";
import { hasMatchStarted } from "../helpers";

/**
 * Resolve initial fixtures based on selection mode (internal - always wraps transaction).
 */
export async function resolveInitialFixturesInternal(
  tx: Prisma.TransactionClient,
  selectionMode: "games" | "teams" | "leagues",
  fixtureIds: number[],
  teamIds: number[],
  leagueIds: number[],
  now: number
): Promise<number[]> {
  if (selectionMode === "games") {
    return fixtureIds;
  }

  if (selectionMode === "leagues" && leagueIds.length > 0) {
    // Build where condition using Query Layer
    const baseWhere = buildUpcomingFixturesWhere({ now });
    const where = buildFixturesByLeaguesWhere(baseWhere, leagueIds);
    const upcoming = await findFixturesTx(
      tx,
      where,
      { id: true },
      { startTs: "asc" }
    );
    return upcoming.map((f) => f.id);
  }

  if (selectionMode === "teams" && teamIds.length > 0) {
    // Build where condition using Query Layer
    const baseWhere = buildUpcomingFixturesWhere({ now });
    const where = buildFixturesByTeamsWhere(baseWhere, teamIds);
    const upcoming = await findFixturesTx(
      tx,
      where,
      { id: true },
      { startTs: "asc" }
    );
    return upcoming.map((f) => f.id);
  }

  return [];
}

/**
 * Attach fixtures to a group (internal - always wraps transaction).
 */
export async function attachFixturesToGroupInternal(
  tx: Prisma.TransactionClient,
  groupId: number,
  fixtureIds: number[]
): Promise<void> {
  if (fixtureIds.length === 0) return;

  await tx.groupFixtures.createMany({
    data: fixtureIds.map((fixtureId) => ({
      groupId,
      fixtureId,
    })),
    skipDuplicates: true,
  });
}

/**
 * Find group fixtures by group ID.
 */
export async function findGroupFixturesByGroupId(groupId: number) {
  return await prisma.groupFixtures.findMany({
    where: { groupId },
    select: { fixtureId: true },
  });
}

/**
 * Delete group fixtures.
 */
export async function deleteGroupFixtures(
  groupId: number,
  fixtureIds: number[]
) {
  if (fixtureIds.length === 0) return;

  return await prisma.groupFixtures.deleteMany({
    where: {
      groupId,
      fixtureId: { in: fixtureIds },
    },
  });
}

/**
 * Find group fixtures with league data for filters.
 */
export async function findGroupFixturesForFilters(groupId: number) {
  return await prisma.groupFixtures.findMany({
    where: { groupId },
    select: {
      fixtureId: true,
      fixtures: {
        select: {
          id: true,
          round: true,
          league: {
            select: {
              id: true,
              name: true,
              imagePath: true,
              country: {
                select: {
                  id: true,
                  name: true,
                  imagePath: true,
                  iso2: true,
                },
              },
              seasons: {
                where: { isCurrent: true },
                select: { id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Find group fixture by groupId and fixtureId.
 */
export async function findGroupFixtureByGroupAndFixture(
  groupId: number,
  fixtureId: number
) {
  return await prisma.groupFixtures.findUnique({
    where: {
      groupId_fixtureId: {
        groupId,
        fixtureId,
      },
    },
  });
}

/**
 * Find group fixtures by groupId and fixtureIds.
 */
export async function findGroupFixturesByFixtureIds(
  groupId: number,
  fixtureIds: number[]
) {
  return await prisma.groupFixtures.findMany({
    where: {
      groupId,
      fixtureId: {
        in: fixtureIds,
      },
    },
  });
}

/**
 * Find fixture data by groupFixture ID (for single prediction validation).
 */
export async function findFixtureByGroupFixtureId(groupFixtureId: number) {
  const gf = await prisma.groupFixtures.findUnique({
    where: { id: groupFixtureId },
    select: {
      fixtures: {
        select: { startTs: true, state: true, result: true },
      },
    },
  });
  return gf?.fixtures ?? null;
}

/**
 * Find all group fixtures with fixture startTs and state (for ranking nudge window).
 */
export async function findGroupFixturesWithFixtureDetails(
  groupId: number
): Promise<
  Array<{ id: number; fixtureId: number; startTs: number; state: string }>
> {
  const rows = await prisma.groupFixtures.findMany({
    where: { groupId },
    select: {
      id: true,
      fixtureId: true,
      fixtures: { select: { startTs: true, state: true } },
    },
  });
  return rows
    .filter((r) => r.fixtures != null)
    .map((r) => ({
      id: r.id,
      fixtureId: r.fixtureId,
      startTs: r.fixtures!.startTs,
      state: r.fixtures!.state,
    }));
}

/**
 * Find group fixtures whose matches have already started (for batch validation).
 */
export async function findStartedFixturesByGroupFixtureIds(
  groupFixtureIds: number[]
) {
  if (groupFixtureIds.length === 0) return [];
  const gfs = await prisma.groupFixtures.findMany({
    where: { id: { in: groupFixtureIds } },
    select: {
      id: true,
      fixtures: {
        select: { startTs: true, state: true, result: true },
      },
    },
  });
  return gfs.filter(
    (gf): gf is typeof gf & { fixtures: NonNullable<typeof gf.fixtures> } =>
      gf.fixtures != null && hasMatchStarted(gf.fixtures)
  );
}

// טיפוס מפורש ל-group fixture עם predictions
export type GroupFixtureWithPredictions = Prisma.groupFixturesGetPayload<{
  select: {
    id: true;
    fixtures: {
      select: typeof FIXTURE_SELECT_WITH_RESULT;
    };
    groupPredictions: {
      select: {
        prediction: true;
        updatedAt: true;
        placedAt: true;
        settledAt: true;
        points: true;
      };
    };
  };
}>;

/**
 * Fetch group fixtures with predictions for a user.
 * Used by getGroupById and getGroupFixtures.
 */
export async function fetchGroupFixturesWithPredictions(
  groupId: number,
  userId: number
): Promise<GroupFixtureWithPredictions[]> {
  const select = {
    id: true, // groupFixtureId needed for predictions
    fixtures: {
      select: FIXTURE_SELECT_WITH_RESULT,
    },
    groupPredictions: {
      where: { userId: userId },
      select: {
        prediction: true,
        updatedAt: true,
        placedAt: true,
        settledAt: true,
        points: true,
      },
    },
  } satisfies Prisma.groupFixturesFindManyArgs["select"];

  return await prisma.groupFixtures.findMany({
    where: { groupId },
    orderBy: {
      fixtures: {
        startTs: "asc",
      },
    },
    select,
  });
}

/**
 * Find group fixtures for predictions overview.
 */
export async function findGroupFixturesForOverview(groupId: number) {
  return await prisma.groupFixtures.findMany({
    where: { groupId },
    orderBy: {
      fixtures: {
        startTs: "asc",
      },
    },
    select: {
      fixtureId: true,
      fixtures: {
        select: {
          id: true,
          name: true,
          startTs: true,
          state: true,
          liveMinute: true,
          result: true,
          homeScore90: true,
          awayScore90: true,
          homeTeam: {
            select: {
              id: true,
              name: true,
              imagePath: true,
            },
          },
          awayTeam: {
            select: {
              id: true,
              name: true,
              imagePath: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Update group with fixtures in a single transaction.
 * When tx is provided, runs inside the given transaction (for atomic updates with groupRules, etc.).
 */
export async function updateGroupWithFixtures(
  groupId: number,
  updateData: Prisma.groupsUpdateInput,
  fixtureIds?: number[],
  tx?: Prisma.TransactionClient
): Promise<Prisma.groupsGetPayload<{}>> {
  const run = async (txn: Prisma.TransactionClient) => {
    const updatedGroup = await txn.groups.update({
      where: { id: groupId },
      data: updateData,
    });

    if (fixtureIds !== undefined) {
      const currentGroupFixtures = await txn.groupFixtures.findMany({
        where: { groupId },
        select: { fixtureId: true },
      });

      const currentFixtureIds = new Set(
        currentGroupFixtures.map((gf) => gf.fixtureId)
      );
      const newFixtureIds = new Set(fixtureIds);

      const fixtureIdsToRemove = Array.from(currentFixtureIds).filter(
        (fixtureId) => !newFixtureIds.has(fixtureId)
      );
      const fixtureIdsToAdd = fixtureIds.filter(
        (fixtureId) => !currentFixtureIds.has(fixtureId)
      );

      if (fixtureIdsToRemove.length > 0) {
        await txn.groupFixtures.deleteMany({
          where: {
            groupId,
            fixtureId: { in: fixtureIdsToRemove },
          },
        });
      }

      if (fixtureIdsToAdd.length > 0) {
        await txn.groupFixtures.createMany({
          data: fixtureIdsToAdd.map((fixtureId) => ({
            groupId,
            fixtureId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedGroup;
  };

  if (tx !== undefined) {
    return run(tx);
  }
  return prisma.$transaction(run);
}
