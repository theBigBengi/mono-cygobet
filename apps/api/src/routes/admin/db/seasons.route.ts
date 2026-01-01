// src/routes/admin/db/seasons.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { SeasonsService } from "../../../services/seasons.service";
import { AdminSeasonsListResponse, AdminSeasonResponse } from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
  parseIncludeString,
} from "../../../utils/routes";
import {
  listSeasonsQuerystringSchema,
  listSeasonsResponseSchema,
  getSeasonParamsSchema,
  getSeasonQuerystringSchema,
  getSeasonResponseSchema,
  getSeason404ResponseSchema,
  searchSeasonsQuerystringSchema,
  searchSeasonsResponseSchema,
} from "../../../schemas/seasons.schemas";
import type {
  ListSeasonsQuerystring,
  GetSeasonQuerystring,
  GetSeasonParams,
  SearchSeasonsQuerystring,
} from "../../../types";

const adminSeasonsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new SeasonsService(fastify);

  // GET /admin/seasons/db - List seasons from database
  fastify.get<{ Reply: AdminSeasonsListResponse }>(
    "/seasons",
    {
      schema: {
        querystring: listSeasonsQuerystringSchema,
        response: {
          200: listSeasonsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSeasonsListResponse> => {
      const query = req.query as ListSeasonsQuerystring;

      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.seasonsInclude = {};
      includeKeys.forEach((key) => {
        if (key === "leagues") {
          (include as any)[key] = true;
        }
      });

      // Always include league
      const includeWithLeague: Prisma.seasonsInclude = {
        ...include,
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      };

      const { seasons, count } = await service.get({
        take,
        skip,
        leagueId: query.leagueId,
        isCurrent: query.isCurrent,
        orderBy: [{ name: "asc" }],
        include: includeWithLeague,
      });

      return reply.send({
        status: "success",
        data: seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          isCurrent: s.isCurrent,
          leagueId: s.leagueId,
          league: (s as any).leagues
            ? {
                id: (s as any).leagues.id,
                name: (s as any).leagues.name,
                imagePath: (s as any).leagues.imagePath,
                type: (s as any).leagues.type,
                externalId: (s as any).leagues.externalId.toString(),
                country: (s as any).leagues.country
                  ? {
                      id: (s as any).leagues.country.id,
                      name: (s as any).leagues.country.name,
                      imagePath: (s as any).leagues.country.imagePath,
                      iso2: (s as any).leagues.country.iso2,
                      iso3: (s as any).leagues.country.iso3,
                      externalId: (
                        s as any
                      ).leagues.country.externalId.toString(),
                    }
                  : null,
              }
            : null,
          externalId: s.externalId.toString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        pagination: createPaginationResponse(page, perPage, count),
        message: "Seasons fetched successfully",
      });
    }
  );

  // GET /admin/seasons/db/:id - Get season by ID
  fastify.get<{
    Params: GetSeasonParams;
    Querystring: GetSeasonQuerystring;
    Reply: AdminSeasonResponse;
  }>(
    "/seasons/:id",
    {
      schema: {
        params: getSeasonParamsSchema,
        querystring: getSeasonQuerystringSchema,
        response: {
          200: getSeasonResponseSchema,
          404: getSeason404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSeasonResponse> => {
      const { id } = req.params;
      const { include } = req.query;

      let seasonId: number;
      try {
        seasonId = parseId(id);
      } catch (error: any) {
        return reply.code(400).send({
          status: "error",
          message: error.message,
        } as any);
      }

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(include);
      const includeObj: Prisma.seasonsInclude = {};
      includeKeys.forEach((key) => {
        if (key === "leagues") {
          (includeObj as any)[key] = true;
        }
      });

      // Always include league
      const includeWithLeague: Prisma.seasonsInclude = {
        ...includeObj,
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      };

      const season = await service.getById(seasonId, includeWithLeague);

      return reply.send({
        status: "success",
        data: {
          id: season.id,
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          isCurrent: season.isCurrent,
          leagueId: season.leagueId,
          league: (season as any).leagues
            ? {
                id: (season as any).leagues.id,
                name: (season as any).leagues.name,
                imagePath: (season as any).leagues.imagePath,
                type: (season as any).leagues.type,
                externalId: (season as any).leagues.externalId.toString(),
                country: (season as any).leagues.country
                  ? {
                      id: (season as any).leagues.country.id,
                      name: (season as any).leagues.country.name,
                      imagePath: (season as any).leagues.country.imagePath,
                      iso2: (season as any).leagues.country.iso2,
                      iso3: (season as any).leagues.country.iso3,
                      externalId: (
                        season as any
                      ).leagues.country.externalId.toString(),
                    }
                  : null,
              }
            : null,
          externalId: season.externalId.toString(),
          createdAt: season.createdAt.toISOString(),
          updatedAt: season.updatedAt.toISOString(),
        },
        message: "Season fetched successfully",
      });
    }
  );

  // GET /admin/seasons/db/search - Search seasons
  fastify.get<{ Reply: AdminSeasonsListResponse }>(
    "/seasons/search",
    {
      schema: {
        querystring: searchSeasonsQuerystringSchema,
        response: {
          200: searchSeasonsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSeasonsListResponse> => {
      const { q, take = 10 } = req.query as SearchSeasonsQuerystring;

      const seasons = await service.search(q, take);

      return reply.send({
        status: "success",
        data: seasons.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          isCurrent: s.isCurrent,
          leagueId: s.leagueId,
          league: (s as any).leagues
            ? {
                id: (s as any).leagues.id,
                name: (s as any).leagues.name,
                imagePath: (s as any).leagues.imagePath,
                type: (s as any).leagues.type,
                externalId: (s as any).leagues.externalId.toString(),
                country: (s as any).leagues.country
                  ? {
                      id: (s as any).leagues.country.id,
                      name: (s as any).leagues.country.name,
                      imagePath: (s as any).leagues.country.imagePath,
                      iso2: (s as any).leagues.country.iso2,
                      iso3: (s as any).leagues.country.iso3,
                      externalId: (
                        s as any
                      ).leagues.country.externalId.toString(),
                    }
                  : null,
              }
            : null,
          externalId: s.externalId.toString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
        pagination: createPaginationResponse(1, take, seasons.length),
        message: "Seasons search completed",
      });
    }
  );
};

export default adminSeasonsDbRoutes;
