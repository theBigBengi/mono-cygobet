// groups/repository/predictions.ts
// Repository functions for group predictions.

import { prisma, FixtureState } from "@repo/db";
import { MEMBER_STATUS } from "../constants";

export type UnsettledPredictionForSettlement = {
  id: number;
  groupId: number;
  groupFixtureId: number;
  userId: number;
  prediction: string;
  fixtureResult: string;
  fixtureHomeScore: number | null;
  fixtureAwayScore: number | null;
};

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

/**
 * Find unsettled predictions for finished (FT) fixtures.
 * Used by the Settlement service to score and close predictions.
 */
export async function findUnsettledPredictionsForFinishedFixtures(): Promise<
  UnsettledPredictionForSettlement[]
> {
  const rows = await prisma.groupPredictions.findMany({
    where: {
      settledAt: null,
      groupFixtures: {
        fixtures: {
          state: FixtureState.FT,
          result: { not: null },
        },
      },
    },
    select: {
      id: true,
      groupId: true,
      groupFixtureId: true,
      userId: true,
      prediction: true,
      groupFixtures: {
        select: {
          fixtures: {
            select: {
              result: true,
              homeScore: true,
              awayScore: true,
            },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    groupFixtureId: r.groupFixtureId,
    userId: r.userId,
    prediction: r.prediction,
    fixtureResult: r.groupFixtures.fixtures.result ?? "",
    fixtureHomeScore: r.groupFixtures.fixtures.homeScore,
    fixtureAwayScore: r.groupFixtures.fixtures.awayScore,
  }));
}

/**
 * Settle multiple predictions in a single transaction (for Settlement service).
 */
export async function settleGroupPredictionsBatch(
  updates: Array<{
    id: number;
    points: number;
    winningCorrectScore: boolean;
    winningMatchWinner: boolean;
  }>
): Promise<void> {
  if (updates.length === 0) return;
  const now = new Date();
  await prisma.$transaction(
    updates.map((u) =>
      prisma.groupPredictions.update({
        where: { id: u.id },
        data: {
          points: String(u.points),
          settledAt: now,
          winningCorrectScore: u.winningCorrectScore,
          winningMatchWinner: u.winningMatchWinner,
          updatedAt: now,
        },
      })
    )
  );
}
