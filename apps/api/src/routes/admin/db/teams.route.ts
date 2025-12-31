// src/routes/admin/db/teams.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { TeamsService } from "../../../services/teams.service";
import { AdminTeamsListResponse, AdminTeamResponse } from "@repo/types";
import {
  listTeamsQuerystringSchema,
  listTeamsResponseSchema,
  getTeamParamsSchema,
  getTeamQuerystringSchema,
  getTeamResponseSchema,
  getTeam404ResponseSchema,
  searchTeamsQuerystringSchema,
  searchTeamsResponseSchema,
} from "../../../schemas/teams.schemas";

const adminTeamsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TeamsService(fastify);

  // GET /admin/teams/db - List teams from database
  fastify.get<{ Reply: AdminTeamsListResponse }>(
    "/teams",
    {
      schema: {
        querystring: listTeamsQuerystringSchema,
        response: {
          200: listTeamsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminTeamsListResponse> => {
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
      let include: Prisma.teamsInclude | undefined = undefined;
      if (query.include) {
        include = {} as Prisma.teamsInclude;
        const includes = query.include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.teamsInclude;
          if (key === "countries") {
            (include as any)[key] = true;
          }
        });
      }

      // Always include country
      const includeWithCountry: Prisma.teamsInclude = {
        ...include,
        countries: {
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

      const { teams, count } = await service.get({
        take,
        skip,
        countryId: query.countryId,
        type: query.type,
        orderBy: [{ name: "asc" }],
        include: includeWithCountry,
      });

      return reply.send({
        status: "success",
        data: teams.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          shortCode: t.shortCode,
          imagePath: t.imagePath,
          founded: t.founded,
          countryId: t.countryId,
          country: (t as any).countries
            ? {
                id: (t as any).countries.id,
                name: (t as any).countries.name,
                imagePath: (t as any).countries.imagePath,
                iso2: (t as any).countries.iso2,
                iso3: (t as any).countries.iso3,
                externalId: (t as any).countries.externalId.toString(),
              }
            : null,
          externalId: t.externalId.toString(),
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          perPage,
          totalItems: count,
          totalPages: Math.ceil(count / perPage),
        },
        message: "Teams fetched successfully",
      });
    }
  );

  // GET /admin/teams/db/:id - Get team by ID from database
  fastify.get<{ Params: { id: string }; Reply: AdminTeamResponse }>(
    "/teams/:id",
    {
      schema: {
        params: getTeamParamsSchema,
        querystring: getTeamQuerystringSchema,
        response: {
          200: getTeamResponseSchema,
          404: getTeam404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminTeamResponse> => {
      const { id } = req.params;
      const { include } = req.query as { include?: string };

      const teamId = parseInt(id, 10);
      if (isNaN(teamId)) {
        return reply.code(400).send({
          status: "error",
          message: "Invalid team ID",
        } as any);
      }

      // Parse include string to Prisma include object
      let includeObj: Prisma.teamsInclude | undefined = undefined;
      if (include) {
        includeObj = {} as Prisma.teamsInclude;
        const includes = include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.teamsInclude;
          if (key === "countries") {
            (includeObj as any)[key] = true;
          }
        });
      }

      // Always include country
      const includeWithCountry: Prisma.teamsInclude = {
        ...includeObj,
        countries: {
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

      const team = await service.getById(teamId, includeWithCountry);

      return reply.send({
        status: "success",
        data: {
          id: team.id,
          name: team.name,
          type: team.type,
          shortCode: team.shortCode,
          imagePath: team.imagePath,
          founded: team.founded,
          countryId: team.countryId,
          country: team.countries
            ? {
                id: team.countries.id,
                name: team.countries.name,
                imagePath: team.countries.imagePath,
                iso2: team.countries.iso2,
                iso3: team.countries.iso3,
                externalId: team.countries.externalId.toString(),
              }
            : null,
          externalId: team.externalId.toString(),
          createdAt: team.createdAt.toISOString(),
          updatedAt: team.updatedAt.toISOString(),
        },
        message: "Team fetched successfully",
      });
    }
  );

  // GET /admin/teams/db/search - Search teams
  fastify.get<{ Reply: any }>(
    "/teams/search",
    {
      schema: {
        querystring: searchTeamsQuerystringSchema,
        response: {
          200: searchTeamsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminTeamsListResponse> => {
      const { q, take = 10 } = req.query as { q: string; take?: number };

      const teams = await service.search(q, take);

      return reply.send({
        status: "success",
        data: teams.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          shortCode: t.shortCode,
          imagePath: t.imagePath,
          founded: t.founded,
          countryId: t.countryId,
          country: (t as any).countries
            ? {
                id: (t as any).countries.id,
                name: (t as any).countries.name,
                imagePath: (t as any).countries.imagePath,
                iso2: (t as any).countries.iso2,
                iso3: (t as any).countries.iso3,
                externalId: (t as any).countries.externalId.toString(),
              }
            : null,
          externalId: t.externalId.toString(),
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        pagination: {
          page: 1,
          perPage: take,
          totalItems: teams.length,
          totalPages: 1,
        },
        message: "Teams search completed",
      });
    }
  );
};

export default adminTeamsDbRoutes;

