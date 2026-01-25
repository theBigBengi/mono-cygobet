// src/services/api/api.teams.service.ts
// API service for teams listing (read-only, for pool creation flow).

import { Prisma, prisma } from "@repo/db";
import type {
  ApiTeamsResponse,
  ApiTeamItem,
  ApiCountryItem,
} from "@repo/types";

/**
 * Get paginated list of teams for pool creation.
 * Supports optional filtering by leagueId.
 * Supports optional search by team name.
 * Optionally includes country when includeCountry is true.
 * Returns minimal fields needed for UI.
 */
export async function getTeams(args: {
  page: number;
  perPage: number;
  leagueId?: number;
  includeCountry?: boolean;
  search?: string;
}): Promise<ApiTeamsResponse> {
  const { page, perPage, leagueId, includeCountry = false, search } = args;
  const skip = (page - 1) * perPage;
  const take = perPage;

  const where: Prisma.teamsWhereInput = {};

  // Build AND conditions array for combining filters
  const andConditions: Prisma.teamsWhereInput[] = [];

  // Filter by league if provided
  // Teams that appear in fixtures for this league (as home or away team)
  if (leagueId !== undefined) {
    andConditions.push({
      OR: [
        {
          fixtures_fixtures_home_team_idToteams: {
            some: {
              leagueId: leagueId,
            },
          },
        },
        {
          fixtures_fixtures_away_team_idToteams: {
            some: {
              leagueId: leagueId,
            },
          },
        },
      ],
    });
  }

  // Search by team name (case-insensitive)
  if (search && search.trim()) {
    andConditions.push({
      OR: [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { shortCode: { contains: search.trim(), mode: "insensitive" } },
      ],
    });
  }

  // Combine all conditions with AND
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [teams, count] = await Promise.all([
    prisma.teams.findMany({
      where,
      select: {
        id: true,
        name: true,
        imagePath: true,
        countryId: true,
        shortCode: true,
        ...(includeCountry && {
          countries: {
            select: {
              id: true,
              name: true,
              imagePath: true,
            },
          },
        }),
      },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    prisma.teams.count({ where }),
  ]);

  const data: ApiTeamItem[] = teams.map((team) => {
    const item: ApiTeamItem = {
      id: team.id,
      name: team.name,
      imagePath: team.imagePath ?? null,
      countryId: team.countryId ?? null,
      shortCode: team.shortCode ?? null,
    };

    if (includeCountry && "countries" in team && team.countries) {
      item.country = {
        id: team.countries.id,
        name: team.countries.name,
        imagePath: team.countries.imagePath ?? null,
      };
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
      pageCount: teams.length,
      hasMore: count > page * perPage,
    },
    message: "Teams fetched successfully",
  };
}
