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
    const upcoming = await findFixturesTx(tx, where, { id: true }, { startTs: "asc" });
    return upcoming.map((f) => f.id);
  }

  if (selectionMode === "teams" && teamIds.length > 0) {
    // Build where condition using Query Layer
    const baseWhere = buildUpcomingFixturesWhere({ now });
    const where = buildFixturesByTeamsWhere(baseWhere, teamIds);
    const upcoming = await findFixturesTx(tx, where, { id: true }, { startTs: "asc" });
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
          result: true,
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
 */
export async function updateGroupWithFixtures(
  groupId: number,
  updateData: Prisma.groupsUpdateInput,
  fixtureIds?: number[]
): Promise<Prisma.groupsGetPayload<{}>> {
  return await prisma.$transaction(async (tx) => {
    // Update the group
    const updatedGroup = await tx.groups.update({
      where: { id: groupId },
      data: updateData,
    });

    // Update groupFixtures if fixtureIds is provided
    if (fixtureIds !== undefined) {
      // Get current groupFixtures
      const currentGroupFixtures = await tx.groupFixtures.findMany({
        where: { groupId },
        select: { fixtureId: true },
      });

      const currentFixtureIds = new Set(
        currentGroupFixtures.map((gf) => gf.fixtureId)
      );
      const newFixtureIds = new Set(fixtureIds);

      // Find fixtures to remove (in current but not in new)
      const fixtureIdsToRemove = Array.from(currentFixtureIds).filter(
        (fixtureId) => !newFixtureIds.has(fixtureId)
      );

      // Find fixtures to add (in new but not in current)
      const fixtureIdsToAdd = fixtureIds.filter(
        (fixtureId) => !currentFixtureIds.has(fixtureId)
      );

      // Remove fixtures that are no longer in the list
      if (fixtureIdsToRemove.length > 0) {
        await tx.groupFixtures.deleteMany({
          where: {
            groupId,
            fixtureId: { in: fixtureIdsToRemove },
          },
        });
      }

      // Add new fixtures
      if (fixtureIdsToAdd.length > 0) {
        await tx.groupFixtures.createMany({
          data: fixtureIdsToAdd.map((fixtureId) => ({
            groupId,
            fixtureId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedGroup;
  });
}
