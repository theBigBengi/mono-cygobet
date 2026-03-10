// src/routes/admin/db/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { availabilityService } from "../../../../services/availability.service";
import { LeaguesService } from "../../../../services/leagues.service";
import { AdminLeaguesListResponse, AdminLeagueResponse } from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
  parseIncludeString,
} from "../../../../utils/routes";
import { getErrorMessage } from "../../../../utils/error.utils";
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
      const wantsCounts = includeKeys.includes("counts");
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
        ...(wantsCounts && {
          _count: { select: { seasons: true, fixtures: true } },
        }),
      };

      // Build where clause with optional search
      const where: Prisma.leaguesWhereInput = {};
      if (query.countryId) {
        where.countryId = query.countryId;
      }
      if (query.type) {
        where.type = query.type;
      }
      if (query.search) {
        where.name = { contains: query.search, mode: "insensitive" };
      }

      const { leagues, count } = await service.get({
        take,
        skip,
        where,
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
          ...(wantsCounts && (l as any)._count && {
            seasonsCount: (l as any)._count.seasons,
            fixturesCount: (l as any)._count.fixtures,
          }),
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
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          message: getErrorMessage(error),
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
  // DELETE /admin/sync-center/db/leagues/:id - Delete league and all related data
  fastify.delete<{
    Params: { id: string };
  }>(
    "/leagues/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      let leagueId: number;
      try {
        leagueId = parseId(req.params.id);
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          message: getErrorMessage(error),
        });
      }

      const league = await prisma.leagues.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          name: true,
          _count: { select: { seasons: true, fixtures: true } },
        },
      });

      if (!league) {
        return reply.code(404).send({
          status: "error",
          message: "League not found",
        });
      }

      // Delete seasons first (no cascade on seasons)
      const deletedSeasons = await prisma.seasons.deleteMany({
        where: { leagueId },
      });

      // Delete league — fixtures cascade automatically
      await prisma.leagues.delete({ where: { id: leagueId } });

      await availabilityService.invalidateCache().catch(() => {});

      return reply.send({
        status: "ok",
        data: {
          leagueId,
          leagueName: league.name,
          deletedSeasons: deletedSeasons.count,
          deletedFixtures: league._count.fixtures,
        },
      });
    }
  );
};

export default adminLeaguesDbRoutes;
