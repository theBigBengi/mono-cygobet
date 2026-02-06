// groups/repository/predictions.ts
// Repository functions for group predictions.

import { prisma } from "@repo/db";
import { MEMBER_STATUS } from "../constants";

/**
 * Upsert a group prediction.
 */
export async function upsertGroupPrediction(data: {
  userId: number;
  groupFixtureId: number;
  groupId: number;
  prediction: string;
}) {
  return await prisma.groupPredictions.upsert({
    where: {
      userId_groupFixtureId: {
        userId: data.userId,
        groupFixtureId: data.groupFixtureId,
      },
    },
    update: {
      prediction: data.prediction,
      updatedAt: new Date(),
    },
    create: {
      groupId: data.groupId,
      groupFixtureId: data.groupFixtureId,
      userId: data.userId,
      prediction: data.prediction,
    },
  });
}

/**
 * Upsert multiple group predictions in a single transaction.
 */
export async function upsertGroupPredictionsBatch(
  groupId: number,
  userId: number,
  predictions: Array<{
    groupFixtureId: number;
    prediction: string;
  }>
) {
  return await prisma.$transaction(
    predictions.map((pred) => {
      return prisma.groupPredictions.upsert({
        where: {
          userId_groupFixtureId: {
            userId,
            groupFixtureId: pred.groupFixtureId,
          },
        },
        update: {
          prediction: pred.prediction,
          updatedAt: new Date(),
        },
        create: {
          groupId,
          groupFixtureId: pred.groupFixtureId,
          userId,
          prediction: pred.prediction,
        },
      });
    })
  );
}

/** Shape returned by findPredictionsForOverview for overview map building. */
export type PredictionForOverview = {
  userId: number;
  groupFixtureId: number;
  prediction: string;
  points: string;
  settledAt: Date | null;
  groupFixtures: { fixtureId: number };
};

/**
 * Find a prediction by user and group fixture (for nudge: check if target has prediction).
 */
export async function findGroupPredictionByUserAndGroupFixture(
  userId: number,
  groupFixtureId: number
) {
  return await prisma.groupPredictions.findUnique({
    where: {
      userId_groupFixtureId: { userId, groupFixtureId },
    },
  });
}

/**
 * Find (groupFixtureId, userId) for all predictions in the group for the given group fixture IDs (for ranking nudge).
 */
export async function findGroupPredictionUserIdsByGroupFixtureIds(
  groupId: number,
  groupFixtureIds: number[]
): Promise<Array<{ groupFixtureId: number; userId: number }>> {
  if (groupFixtureIds.length === 0) return [];
  const rows = await prisma.groupPredictions.findMany({
    where: { groupId, groupFixtureId: { in: groupFixtureIds } },
    select: { groupFixtureId: true, userId: true },
  });
  return rows.map((r) => ({
    groupFixtureId: r.groupFixtureId,
    userId: r.userId,
  }));
}

/**
 * Find current user's predictions for a fixture across all groups (joined only).
 */
export async function findUserPredictionsForFixture(
  userId: number,
  fixtureId: number
) {
  return await prisma.groupPredictions.findMany({
    where: {
      userId,
      groupFixtures: { fixtureId },
      groupMembers: { status: MEMBER_STATUS.JOINED },
    },
    select: {
      prediction: true,
      points: true,
      settledAt: true,
      placedAt: true,
      updatedAt: true,
      groupFixtures: {
        select: { groups: { select: { id: true, name: true } } },
      },
    },
  });
}

/**
 * Find predictions for overview (raw query only).
 * Note: This is used by buildPredictionsMap in helpers.ts.
 */
export async function findPredictionsForOverview(
  groupId: number
): Promise<PredictionForOverview[]> {
  return await prisma.groupPredictions.findMany({
    where: {
      groupId,
      groupMembers: {
        status: MEMBER_STATUS.JOINED,
      },
    },
    select: {
      userId: true,
      groupFixtureId: true,
      prediction: true,
      points: true,
      settledAt: true,
      groupFixtures: {
        select: {
          fixtureId: true,
        },
      },
    },
  });
}
