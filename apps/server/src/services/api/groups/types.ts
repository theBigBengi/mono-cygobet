// groups/types.ts
// Type definitions for groups service.

import type { Prisma } from "@repo/db";
import { FIXTURE_SELECT_BASE, FIXTURE_SELECT_WITH_RESULT } from "../fixtures/selects";

/**
 * Type for fixture data from Prisma with relations (without result).
 * Based on FIXTURE_SELECT_BASE from fixtures/selects.ts.
 */
export type FixtureWithRelations = Prisma.fixturesGetPayload<{
  select: typeof FIXTURE_SELECT_BASE;
}>;

/**
 * Type for fixture data from Prisma with relations (with result).
 * Based on FIXTURE_SELECT_WITH_RESULT from fixtures/selects.ts.
 */
export type FixtureWithRelationsAndResult = Prisma.fixturesGetPayload<{
  select: typeof FIXTURE_SELECT_WITH_RESULT;
}>;

/**
 * Type for prediction row from Prisma
 */
export type PredictionRow = {
  prediction: string;
  updatedAt: Date;
  placedAt: Date;
  settledAt: Date | null;
  points: number | string | null;
};

/**
 * Type for parsed prediction
 */
export type ParsedPrediction = {
  home: number;
  away: number;
  updatedAt: string;
  placedAt: string;
  settled: boolean;
  points: number | null;
};

/**
 * Type for predictions overview participant
 */
export type PredictionsOverviewParticipant = {
  id: number;
  username: string | null;
  number: number;
};

/**
 * Type for predictions overview fixture
 */
export type PredictionsOverviewFixture = {
  id: number;
  name: string;
  homeTeam: {
    id: number;
    name: string;
    imagePath: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    imagePath: string | null;
  };
  result: string | null;
  startTs: number;
  state: string;
  liveMinute?: number | null;
};

/**
 * Type for predictions overview response data
 */
export type PredictionsOverviewData = {
  participants: Array<PredictionsOverviewParticipant>;
  fixtures: Array<PredictionsOverviewFixture>;
  predictions: Record<string, string | null>;
};

/**
 * Type for predictions overview response
 */
export type PredictionsOverviewResponse = {
  status: "success";
  data: PredictionsOverviewData;
  message: string;
};

export type RankingItem = {
  rank: number;
  userId: number;
  username: string | null;
  totalPoints: number;
  predictionCount: number;
  correctScoreCount: number;
  correctOutcomeCount: number;
};

export type RankingResponse = {
  status: "success";
  data: RankingItem[];
  message: string;
};
