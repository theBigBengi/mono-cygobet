// fixtures/fixture-detail.ts
// Service for GET /api/fixtures/:id — full fixture + user's predictions across all groups.

import { prisma } from "@repo/db";
import { FIXTURE_SELECT_DETAIL } from "./selects";
import type {
  ApiFixtureDetailResponse,
  ApiMyPredictionForFixtureItem,
} from "@repo/types";
import { findUserPredictionsForFixture } from "../groups/repository/predictions";
import { parsePrediction } from "../groups/helpers";

export type FixtureDetailData = ApiFixtureDetailResponse["data"];

/**
 * Get full fixture by id with current user's predictions across all groups.
 * Returns null if fixture not found.
 */
export async function getFixtureDetail(
  fixtureId: number,
  userId: number
): Promise<FixtureDetailData | null> {
  const fixture = await prisma.fixtures.findUnique({
    where: { id: fixtureId },
    select: FIXTURE_SELECT_DETAIL,
  });

  if (!fixture) return null;

  const groupFixtures = await prisma.groupFixtures.findMany({
    where: { fixtureId },
    select: {
      groupId: true,
      groups: {
        select: {
          id: true,
          name: true,
          groupRules: {
            select: { predictionMode: true },
          },
        },
      },
      groupPredictions: {
        where: { userId },
        select: {
          prediction: true,
          settledAt: true,
          points: true,
        },
      },
    },
  });

  const predictions = groupFixtures
    .filter((gf) => gf.groupPredictions.length > 0)
    .map((gf) => {
      const pred = gf.groupPredictions[0]!;
      const settled = pred.settledAt != null;
      const points = settled ? Number(pred.points) || 0 : null;
      const predictionMode =
        gf.groups.groupRules?.predictionMode ?? "CorrectScore";
      return {
        groupId: gf.groups.id,
        groupName: gf.groups.name,
        prediction: pred.prediction,
        settled,
        points,
        predictionMode: String(predictionMode),
      };
    });

  const homeTeam = fixture.homeTeam
    ? {
        id: fixture.homeTeam.id,
        name: fixture.homeTeam.name,
        imagePath: fixture.homeTeam.imagePath ?? null,
      }
    : { id: 0, name: "", imagePath: null as string | null };
  const awayTeam = fixture.awayTeam
    ? {
        id: fixture.awayTeam.id,
        name: fixture.awayTeam.name,
        imagePath: fixture.awayTeam.imagePath ?? null,
      }
    : { id: 0, name: "", imagePath: null as string | null };
  const league = fixture.league
    ? {
        id: fixture.league.id,
        name: fixture.league.name,
        imagePath: fixture.league.imagePath ?? null,
      }
    : null;
  const country = fixture.league?.country
    ? {
        id: fixture.league.country.id,
        name: fixture.league.country.name,
        imagePath: fixture.league.country.imagePath ?? null,
      }
    : null;

  return {
    id: fixture.id,
    name: fixture.name,
    kickoffAt: fixture.startIso,
    startTs: fixture.startTs,
    state: String(fixture.state),
    stage: fixture.stage ?? null,
    round: fixture.round ?? null,
    liveMinute: fixture.liveMinute ?? null,
    result: fixture.result ?? null,
    homeScore90: fixture.homeScore90 ?? null,
    awayScore90: fixture.awayScore90 ?? null,
    homeScoreET: fixture.homeScoreET ?? null,
    awayScoreET: fixture.awayScoreET ?? null,
    penHome: fixture.penHome ?? null,
    penAway: fixture.penAway ?? null,
    homeTeam,
    awayTeam,
    league,
    country,
    predictions,
  };
}

/**
 * Get current user's predictions for a fixture across all joined groups.
 */
export async function getMyPredictionsForFixture(
  userId: number,
  fixtureId: number
): Promise<ApiMyPredictionForFixtureItem[]> {
  const rows = await findUserPredictionsForFixture(userId, fixtureId);
  return rows.map((p) => {
    const parsed = parsePrediction(p.prediction, {
      prediction: p.prediction,
      points: p.points,
      settledAt: p.settledAt,
      placedAt: p.placedAt,
      updatedAt: p.updatedAt,
    });
    const points =
      p.points != null && p.points !== ""
        ? typeof p.points === "string"
          ? parseInt(p.points, 10)
          : p.points
        : null;
    return {
      groupId: p.groupFixtures.groups.id,
      groupName: p.groupFixtures.groups.name,
      prediction: parsed ? { home: parsed.home, away: parsed.away } : null,
      points: points != null && !isNaN(points) ? points : null,
      isSettled: p.settledAt != null,
    };
  });
}
