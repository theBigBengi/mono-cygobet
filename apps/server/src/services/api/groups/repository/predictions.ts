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

/**
 * Find predictions for overview (raw query only).
 * Note: This is used by buildPredictionsMap in helpers.ts.
 */
export async function findPredictionsForOverview(
  groupId: number
) {
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
      groupFixtures: {
        select: {
          fixtureId: true,
        },
      },
    },
  });
}
