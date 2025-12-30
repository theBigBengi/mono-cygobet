// src/routes/admin/db/leagues.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { LeaguesService } from "../../../services/leagues.service";
import { AdminLeaguesListResponse, AdminLeagueResponse } from "@repo/types";
import {
  listLeaguesQuerystringSchema,
  listLeaguesResponseSchema,
  getLeagueParamsSchema,
  getLeagueQuerystringSchema,
  getLeagueResponseSchema,
  getLeague404ResponseSchema,
  searchLeaguesQuerystringSchema,
  searchLeaguesResponseSchema,
} from "../../../schemas/leagues.schemas";

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
      const query = req.query as {
        page?: number;
        perPage?: number;
        countryId?: number;
        type?: string;
        include?: string;
      };

      const page = query.page ?? 1;
      const perPage = query.perPage ?? 20;
      const skip = (page - 1) * perPage;
      const take = perPage;

      // Parse include string to Prisma include object
      let include: Prisma.leaguesInclude | undefined = undefined;
      if (query.include) {
        include = {} as Prisma.leaguesInclude;
        const includes = query.include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.leaguesInclude;
          if (key === "country" || key === "seasons" || key === "fixtures") {
            (include as any)[key] = true;
          }
        });
      }

      const { leagues, count } = await service.get({
        take,
        skip,
        countryId: query.countryId,
        type: query.type,
        orderBy: [{ name: "asc" }],
        include,
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
          externalId: l.externalId.toString(),
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          perPage,
          totalItems: count,
          totalPages: Math.ceil(count / perPage),
        },
        message: "Leagues fetched successfully",
      });
    }
  );

  // GET /admin/leagues/db/:id - Get league by ID from database
  fastify.get<{ Params: { id: string }; Reply: AdminLeagueResponse }>(
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
      const { include } = req.query as { include?: string };

      const leagueId = parseInt(id, 10);
      if (isNaN(leagueId)) {
        return reply.code(400).send({
          status: "error",
          message: "Invalid league ID",
        } as any);
      }

      // Parse include string to Prisma include object
      let includeObj: Prisma.leaguesInclude | undefined = undefined;
      if (include) {
        includeObj = {} as Prisma.leaguesInclude;
        const includes = include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.leaguesInclude;
          if (key === "country" || key === "seasons" || key === "fixtures") {
            (includeObj as any)[key] = true;
          }
        });
      }

      const league = await service.getById(leagueId, includeObj);

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
      const { q, take } = req.query as { q: string; take?: number };

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
          externalId: l.externalId.toString(),
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        pagination: {
          page: 1,
          perPage: leagues.length,
          totalItems: leagues.length,
          totalPages: 1,
        },
        message: "Leagues search completed",
      });
    }
  );
};

export default adminLeaguesDbRoutes;
