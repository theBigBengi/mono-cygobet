// src/routes/admin/db/teams.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { TeamsService } from "../../../../services/teams.service";
import {
  AdminTeamsListResponse,
  AdminTeamResponse,
  AdminTeamsBulkUpdateRequest,
  AdminTeamsBulkUpdateResponse,
  AdminUpdateTeamResponse,
} from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
  parseIncludeString,
} from "../../../../utils/routes";
import { getErrorMessage } from "../../../../utils/error.utils";
import { NotFoundError } from "../../../../utils/errors";
import {
  listTeamsQuerystringSchema,
  listTeamsResponseSchema,
  getTeamParamsSchema,
  getTeamQuerystringSchema,
  getTeamResponseSchema,
  getTeam404ResponseSchema,
  searchTeamsQuerystringSchema,
  searchTeamsResponseSchema,
  updateTeamBodySchema,
  updateTeamResponseSchema,
  bulkUpdateTeamsBodySchema,
  bulkUpdateTeamsResponseSchema,
} from "../../../../schemas/admin/teams.schemas";
import type {
  ListTeamsQuerystring,
  GetTeamQuerystring,
  GetTeamParams,
  SearchTeamsQuerystring,
} from "../../../../types";

// Prisma payload type with countries relation
type TeamWithCountry = Prisma.teamsGetPayload<{
  include: {
    countries: {
      select: {
        id: true;
        name: true;
        imagePath: true;
        iso2: true;
        iso3: true;
        externalId: true;
      };
    };
  };
}>;

// Response mapper - single source of truth for team serialization
function mapTeamToResponse(team: TeamWithCountry) {
  return {
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
    primaryColor: team.firstKitColor ?? null,
    secondaryColor: team.secondKitColor ?? null,
    tertiaryColor: team.thirdKitColor ?? null,
    externalId: team.externalId.toString(),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

// Mapper for update response (uses only team scalar fields)
function mapTeamToUpdateResponse(
  team: Pick<
    Prisma.teamsGetPayload<Record<string, never>>,
    | "id"
    | "name"
    | "type"
    | "shortCode"
    | "imagePath"
    | "founded"
    | "countryId"
    | "firstKitColor"
    | "secondKitColor"
    | "thirdKitColor"
    | "externalId"
    | "createdAt"
    | "updatedAt"
  >
) {
  return {
    id: team.id,
    name: team.name,
    type: team.type,
    shortCode: team.shortCode,
    imagePath: team.imagePath,
    founded: team.founded,
    countryId: team.countryId,
    primaryColor: team.firstKitColor ?? null,
    secondaryColor: team.secondKitColor ?? null,
    tertiaryColor: team.thirdKitColor ?? null,
    externalId: team.externalId.toString(),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

const adminTeamsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TeamsService(fastify);

  // GET /admin/teams/db - List teams from database
  fastify.get<{
    Querystring: ListTeamsQuerystring;
    Reply: AdminTeamsListResponse;
  }>(
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
      const query = req.query;
      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.teamsInclude = {};
      if (includeKeys.includes("countries")) {
        include.countries = true;
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

      // Build where clause with optional filters
      const where: Prisma.teamsWhereInput = {};
      if (query.countryId) {
        where.countryId = query.countryId;
      }
      if (query.type) {
        where.type = query.type;
      }
      if (query.search) {
        where.name = { contains: query.search, mode: "insensitive" };
      }
      if (query.leagueId) {
        where.OR = [
          { fixtures_fixtures_home_team_idToteams: { some: { leagueId: query.leagueId } } },
          { fixtures_fixtures_away_team_idToteams: { some: { leagueId: query.leagueId } } },
        ];
      }

      const { teams, count } = await service.get({
        take,
        skip,
        where,
        orderBy: [{ name: "asc" }],
        include: includeWithCountry,
      });

      // Prisma can't infer payload type when include is dynamic; cast is intentional
      return reply.send({
        status: "success",
        data: (teams as TeamWithCountry[]).map(mapTeamToResponse),
        pagination: createPaginationResponse(page, perPage, count),
        message: "Teams fetched successfully",
      });
    }
  );

  // GET /admin/teams/db/:id - Get team by ID from database
  fastify.get<{
    Params: GetTeamParams;
    Querystring: GetTeamQuerystring;
    Reply: AdminTeamResponse;
  }>(
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
      const { include } = req.query;

      let teamId: number;
      try {
        teamId = parseId(id);
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          data: null,
          message: getErrorMessage(error),
        } as unknown as AdminTeamResponse);
      }

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(include);
      const includeObj: Prisma.teamsInclude = {};
      if (includeKeys.includes("countries")) {
        includeObj.countries = true;
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

      // Prisma can't infer payload type when include is dynamic; cast is intentional
      return reply.send({
        status: "success",
        data: mapTeamToResponse(team as TeamWithCountry),
        message: "Team fetched successfully",
      });
    }
  );

  // GET /admin/teams/db/search - Search teams
  fastify.get<{
    Querystring: SearchTeamsQuerystring;
    Reply: AdminTeamsListResponse;
  }>(
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
      const { q, take = 10 } = req.query;

      const teams = await service.search(q, take);

      // Prisma can't infer payload type when include is dynamic; cast is intentional
      return reply.send({
        status: "success",
        data: (teams as TeamWithCountry[]).map(mapTeamToResponse),
        pagination: createPaginationResponse(1, take, teams.length),
        message: "Teams search completed",
      });
    }
  );

  // PATCH /admin/sync-center/db/teams/:id - Update team
  fastify.patch<{
    Params: GetTeamParams;
    Body: {
      name?: string;
      shortCode?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      tertiaryColor?: string | null;
    };
    Reply: AdminUpdateTeamResponse;
  }>(
    "/teams/:id",
    {
      schema: {
        params: getTeamParamsSchema,
        body: updateTeamBodySchema,
        response: {
          200: updateTeamResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminUpdateTeamResponse> => {
      const { id } = req.params;

      let teamId: number;
      try {
        teamId = parseId(id);
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          data: null,
          message: getErrorMessage(error),
        } as unknown as AdminUpdateTeamResponse);
      }

      try {
        const team = await service.update(teamId, req.body);

        return reply.send({
          status: "success",
          data: mapTeamToUpdateResponse(team),
          message: "Team updated successfully",
        });
      } catch (error: unknown) {
        if (error instanceof NotFoundError) {
          return reply.code(404).send({
            status: "error",
            data: null,
            message: error.message,
          } as unknown as AdminUpdateTeamResponse);
        }
        throw error;
      }
    }
  );

  // POST /admin/sync-center/db/teams/bulk-update - Bulk update team colors
  fastify.post<{
    Body: { teams: AdminTeamsBulkUpdateRequest["teams"] };
    Reply: AdminTeamsBulkUpdateResponse;
  }>(
    "/teams/bulk-update",
    {
      schema: {
        body: bulkUpdateTeamsBodySchema,
        response: {
          200: bulkUpdateTeamsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminTeamsBulkUpdateResponse> => {
      const results = await service.bulkUpdateColors(req.body.teams);

      return reply.send({
        status: "success",
        data: results,
        message: `Updated ${results.updated} teams. ${results.notFound.length} not found.`,
      });
    }
  );
};

export default adminTeamsDbRoutes;
