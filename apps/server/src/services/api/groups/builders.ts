// groups/builders.ts
// DTO builders for groups - transform Prisma data to API format.

import type { ApiFixturesListResponse, ApiGroupPrivacy, ApiGroupItem } from "@repo/types";
import { GROUP_STATUS } from "./constants";
import type {
  FixtureWithRelations,
  FixtureWithRelationsAndResult,
  ParsedPrediction,
} from "./types";

export type GroupStatus =
  | typeof GROUP_STATUS.DRAFT
  | typeof GROUP_STATUS.ACTIVE
  | typeof GROUP_STATUS.ENDED;

/**
 * Build a group item from database group data.
 *
 * @param group - Group data from Prisma
 * @returns Formatted group item in API format
 */
export function buildGroupItem(group: {
  id: number;
  name: string;
  privacy: string;
  status: GroupStatus;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
}): {
  id: number;
  name: string;
  privacy: ApiGroupPrivacy;
  status: GroupStatus;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: group.id,
    name: group.name,
    privacy: group.privacy as ApiGroupPrivacy,
    status: group.status,
    creatorId: group.creatorId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

/**
 * Build a draft group item with first game.
 * Used by getMyGroups for draft groups.
 *
 * @param group - Group data from Prisma
 * @param firstGame - First game fixture or null
 * @returns Formatted group item with firstGame
 */
export function buildDraftGroupItem(
  group: {
    id: number;
    name: string;
    privacy: string;
    status: GroupStatus;
    creatorId: number;
    createdAt: Date;
    updatedAt: Date;
  },
  firstGame: ApiFixturesListResponse["data"][0] | null
): ApiGroupItem & { firstGame: ApiFixturesListResponse["data"][0] | null } {
  return {
    ...buildGroupItem(group),
    firstGame,
  };
}

/**
 * Build an active/ended group item with stats and next game.
 * Used by getMyGroups for active/ended groups.
 *
 * @param group - Group data from Prisma
 * @param stats - Group statistics
 * @param nextGame - Next game fixture or null
 * @returns Formatted group item with stats and nextGame
 */
export function buildActiveGroupItem(
  group: {
    id: number;
    name: string;
    privacy: string;
    status: GroupStatus;
    creatorId: number;
    createdAt: Date;
    updatedAt: Date;
  },
  stats: {
    memberCount: number;
    totalFixtures: number;
    predictionsCount: number;
    hasUnpredictedGames: boolean;
  },
  nextGame: ApiFixturesListResponse["data"][0] | null
): ApiGroupItem & {
  memberCount: number;
  nextGame: ApiFixturesListResponse["data"][0] | null;
  predictionsCount: number;
  totalFixtures: number;
  hasUnpredictedGames: boolean;
} {
  return {
    ...buildGroupItem(group),
    ...stats,
    nextGame,
  };
}

/**
 * Format a fixture from Prisma database format to API format.
 * Pure composition function - receives all data as parameters, makes no decisions.
 *
 * @param fixture - Fixture data from Prisma with relations (with or without result)
 * @param prediction - Optional parsed prediction to include
 * @param result - Result string (required - service layer must decide which result to use)
 * @returns Formatted fixture in API format, or null if fixture is invalid
 */
export function formatFixtureFromDb(
  fixture: (FixtureWithRelations | FixtureWithRelationsAndResult) | null | undefined,
  prediction: ParsedPrediction | null | undefined,
  result: string | null
): ApiFixturesListResponse["data"][0] | null {
  if (!fixture) return null;

  const country = fixture.league?.country
    ? {
        id: fixture.league.country.id,
        name: fixture.league.country.name,
        imagePath: fixture.league.country.imagePath,
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
    league: fixture.league
      ? {
          id: fixture.league.id,
          name: fixture.league.name,
          imagePath: fixture.league.imagePath ?? null,
        }
      : undefined,
    homeTeam: fixture.homeTeam
      ? {
          id: fixture.homeTeam.id,
          name: fixture.homeTeam.name,
          imagePath: fixture.homeTeam.imagePath ?? null,
        }
      : undefined,
    awayTeam: fixture.awayTeam
      ? {
          id: fixture.awayTeam.id,
          name: fixture.awayTeam.name,
          imagePath: fixture.awayTeam.imagePath ?? null,
        }
      : undefined,
    country,
    odds: undefined,
    prediction: prediction ?? undefined,
    result: result ?? null,
  };
}
