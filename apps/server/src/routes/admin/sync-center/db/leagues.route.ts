// src/routes/admin/db/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { LeaguesService } from "../../../../services/leagues.service";
import { AdminLeaguesListResponse, AdminLeagueResponse } from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
  parseIncludeString,
} from "../../../../utils/routes";
import {
  listLeaguesQuerystringSchema,
  listLeaguesResponseSchema,
  getLeagueParamsSchema,
  getLeagueQuerystringSchema,
  getLeagueResponseSchema,
  getLeague404ResponseSchema,
  searchLeaguesQuerystringSchema,
  searchLeaguesResponseSchema,
} from "../../../../schemas/admin/leagues.schemas";
import type {
  ListLeaguesQuerystring,
  GetLeagueQuerystring,
  GetLeagueParams,
  SearchLeaguesQuerystring,
} from "../../../../types";

const adminLeaguesDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new LeaguesService(fastify);

  // GET /admin/leagues/db - List leagues from database
  fastify.get<{ Reply: AdminLeaguesListResponse }>(
    "/leagues",
    {
      schema: {
        querystring: listLeaguesQuerystringSchema,
        response: {
          200: listLeaguesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminLeaguesListResponse> => {
      const query = req.query as ListLeaguesQuerystring;

      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.leaguesInclude = {};
      includeKeys.forEach((key) => {
        if (key === "country" || key === "seasons" || key === "fixtures") {
          (include as any)[key] = true;
        }
      });

      // Always include country
      const includeWithCountry: Prisma.leaguesInclude = {
        ...include,
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
      };

      const { leagues, count } = await service.get({
        take,
        skip,
        countryId: query.countryId,
        type: query.type,
        orderBy: [{ name: "asc" }],
        include: includeWithCountry,
      });

      return reply.send({
        status: "success",
        data: leagues.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          shortCode: l.shortCode,
          subType: l.subType,
          imagePath: l.imagePath,
          countryId: l.countryId,
          country: (l as any).country
            ? {
                id: (l as any).country.id,
                name: (l as any).country.name,
                imagePath: (l as any).country.imagePath,
                iso2: (l as any).country.iso2,
                iso3: (l as any).country.iso3,
                externalId: (l as any).country.externalId.toString(),
              }
            : null,
          externalId: l.externalId.toString(),
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        pagination: createPaginationResponse(page, perPage, count),
        message: "Leagues fetched successfully",
      });
    }
  );

  // GET /admin/leagues/db/:id - Get league by ID from database
  fastify.get<{
    Params: GetLeagueParams;
    Querystring: GetLeagueQuerystring;
    Reply: AdminLeagueResponse;
  }>(
    "/leagues/:id",
    {
      schema: {
        params: getLeagueParamsSchema,
        querystring: getLeagueQuerystringSchema,
        response: {
          200: getLeagueResponseSchema,
          404: getLeague404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminLeagueResponse> => {
      const { id } = req.params;
      const { include } = req.query;

      let leagueId: number;
      try {
        leagueId = parseId(id);
      } catch (error: any) {
        return reply.code(400).send({
          status: "error",
          message: error.message,
        } as any);
      }

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(include);
      const includeObj: Prisma.leaguesInclude = {};
      includeKeys.forEach((key) => {
        if (key === "country" || key === "seasons" || key === "fixtures") {
          (includeObj as any)[key] = true;
        }
      });

      // Always include country
      const includeWithCountry: Prisma.leaguesInclude = {
        ...includeObj,
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
      };

      const league = await service.getById(leagueId, includeWithCountry);

      return reply.send({
        status: "success",
        data: {
          id: league.id,
          name: league.name,
          type: league.type,
          shortCode: league.shortCode,
          subType: league.subType,
          imagePath: league.imagePath,
          countryId: league.countryId,
          country: (league as any).country
            ? {
                id: (league as any).country.id,
                name: (league as any).country.name,
                imagePath: (league as any).country.imagePath,
                iso2: (league as any).country.iso2,
                iso3: (league as any).country.iso3,
                externalId: (league as any).country.externalId.toString(),
              }
            : null,
          externalId: league.externalId.toString(),
          createdAt: league.createdAt.toISOString(),
          updatedAt: league.updatedAt.toISOString(),
        },
        message: "League fetched successfully",
      });
    }
  );

  // GET /admin/leagues/db/search - Search leagues in database
  fastify.get<{ Reply: AdminLeaguesListResponse }>(
    "/leagues/search",
    {
      schema: {
        querystring: searchLeaguesQuerystringSchema,
        response: {
          200: searchLeaguesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminLeaguesListResponse> => {
      const { q, take } = req.query as SearchLeaguesQuerystring;

      // Search already includes country by default
      const leagues = await service.search(q, take || 10);

      return reply.send({
        status: "success",
        data: leagues.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          shortCode: l.shortCode,
          subType: l.subType,
          imagePath: l.imagePath,
          countryId: l.countryId,
          country: (l as any).country
            ? {
                id: (l as any).country.id,
                name: (l as any).country.name,
                imagePath: (l as any).country.imagePath,
                iso2: (l as any).country.iso2,
                iso3: (l as any).country.iso3,
                externalId: (l as any).country.externalId.toString(),
              }
            : null,
          externalId: l.externalId.toString(),
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        pagination: createPaginationResponse(1, leagues.length, leagues.length),
        message: "Leagues search completed",
      });
    }
  );
};

console.log("REGISTERING adminLeaguesDbRoutes");
export default adminLeaguesDbRoutes;
