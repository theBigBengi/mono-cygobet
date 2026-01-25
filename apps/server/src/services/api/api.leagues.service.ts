// src/services/api/api.leagues.service.ts
// API service for leagues listing (read-only, for pool creation flow).

import { Prisma, prisma } from "@repo/db";
import type {
  ApiLeaguesResponse,
  ApiLeagueItem,
  ApiSeasonItem,
} from "@repo/types";

/**
 * Get paginated list of leagues for pool creation.
 * Returns minimal fields needed for UI.
 * Optionally includes seasons when includeSeasons is true.
 * Optionally filters to only leagues with active seasons when onlyActiveSeasons is true.
 */
export async function getLeagues(args: {
  page: number;
  perPage: number;
  includeSeasons?: boolean;
  onlyActiveSeasons?: boolean;
}): Promise<ApiLeaguesResponse> {
  const {
    page,
    perPage,
    includeSeasons = false,
    onlyActiveSeasons = false,
  } = args;
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where: Prisma.leaguesWhereInput = {};

  // Filter to only leagues with active seasons (isCurrent: true)
  if (onlyActiveSeasons) {
    where.seasons = {
      some: {
        isCurrent: true,
      },
    };
  }

  const [leagues, count] = await Promise.all([
    prisma.leagues.findMany({
      where,
      select: {
        id: true,
        name: true,
        imagePath: true,
        countryId: true,
        type: true,
        shortCode: true,
        ...(includeSeasons && {
          seasons: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              leagueId: true,
            },
            ...(onlyActiveSeasons
              ? {
                  where: {
                    isCurrent: true,
                  },
                }
              : {}),
            orderBy: { name: "asc" },
          },
        }),
      },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    prisma.leagues.count({ where }),
  ]);

  const data: ApiLeagueItem[] = leagues.map((league) => {
    const item: ApiLeagueItem = {
      id: league.id,
      name: league.name,
      imagePath: league.imagePath ?? null,
      countryId: league.countryId,
      type: league.type,
      shortCode: league.shortCode ?? null,
    };

    if (includeSeasons && "seasons" in league && league.seasons) {
      item.seasons = league.seasons.map(
        (season): ApiSeasonItem => ({
          id: season.id,
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          isCurrent: season.isCurrent,
          leagueId: season.leagueId,
        })
      );
    }

    return item;
  });

  const totalPages = Math.ceil(count / perPage);

  return {
    status: "success",
    data,
    pagination: {
      page,
      perPage,
      totalItems: count,
      totalPages,
      pageCount: leagues.length,
      hasMore: count > page * perPage,
    },
    message: "Leagues fetched successfully",
  };
}
