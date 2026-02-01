// src/routes/admin/db/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { FixturesService } from "../../../../services/fixtures.service";
import { AdminFixturesListResponse, AdminFixtureResponse } from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
  parseIncludeString,
} from "../../../../utils/routes";
import { getErrorMessage, getErrorProp } from "../../../../utils/error.utils";
import {
  listFixturesQuerystringSchema,
  listFixturesResponseSchema,
  getFixtureParamsSchema,
  getFixtureQuerystringSchema,
  getFixtureResponseSchema,
  getFixture404ResponseSchema,
  searchFixturesQuerystringSchema,
  searchFixturesResponseSchema,
  updateFixtureBodySchema,
  updateFixtureResponseSchema,
  updateFixture404ResponseSchema,
} from "../../../../schemas/admin/fixtures.schemas";
import type {
  ListFixturesQuerystring,
  GetFixtureQuerystring,
  GetFixtureParams,
  SearchFixturesQuerystring,
} from "../../../../types";

// Helper function to map fixture to response format
function mapFixtureToResponse(f: any) {
  return {
    id: f.id,
    name: f.name,
    startIso: f.startIso,
    startTs: f.startTs,
    state: f.state,
    result: f.result,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    stage: f.stage,
    round: f.round,
    leagueId: f.leagueId,
    seasonId: f.seasonId,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    homeTeam: f.homeTeam
      ? {
          id: f.homeTeam.id,
          name: f.homeTeam.name,
          imagePath: f.homeTeam.imagePath,
          externalId: f.homeTeam.externalId.toString(),
        }
      : null,
    awayTeam: f.awayTeam
      ? {
          id: f.awayTeam.id,
          name: f.awayTeam.name,
          imagePath: f.awayTeam.imagePath,
          externalId: f.awayTeam.externalId.toString(),
        }
      : null,
    league: f.league
      ? {
          id: f.league.id,
          name: f.league.name,
          imagePath: f.league.imagePath,
          type: f.league.type,
          externalId: f.league.externalId.toString(),
        }
      : null,
    season: f.season
      ? {
          id: f.season.id,
          name: f.season.name,
          externalId: f.season.externalId.toString(),
        }
      : null,
    externalId: f.externalId.toString(),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    scoreOverriddenAt: f.scoreOverriddenAt?.toISOString?.() ?? null,
    scoreOverriddenById: f.scoreOverriddenById ?? null,
    scoreOverriddenBy: f.scoreOverriddenBy
      ? {
          id: f.scoreOverriddenBy.id,
          name: f.scoreOverriddenBy.name,
          email: f.scoreOverriddenBy.email,
        }
      : null,
  };
}

const adminFixturesDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new FixturesService(fastify);

  // GET /admin/db/fixtures - List fixtures from database
  fastify.get<{ Reply: AdminFixturesListResponse }>(
    "/fixtures",
    {
      schema: {
        querystring: listFixturesQuerystringSchema,
        response: {
          200: listFixturesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminFixturesListResponse> => {
      const query = req.query as ListFixturesQuerystring;

      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.fixturesInclude = {};

      const teamSelect = {
        id: true,
        name: true,
        imagePath: true,
        externalId: true,
      };
      const leagueSelect = {
        id: true,
        name: true,
        imagePath: true,
        type: true,
        externalId: true,
      };
      const seasonSelect = { id: true, name: true, externalId: true };

      includeKeys.forEach((key) => {
        if (key === "homeTeam" || key === "awayTeam") {
          (include as any)[key] = { select: teamSelect };
        } else if (key === "league") {
          (include as any)[key] = { select: leagueSelect };
        } else if (key === "season") {
          (include as any)[key] = { select: seasonSelect };
        }
      });

      // Parse leagueIds and countryIds from query string (external IDs)
      // Convert external IDs to DB IDs
      let leagueDbIds: number[] | undefined;
      if (query.leagueIds) {
        const leagueExternalIds = query.leagueIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (leagueExternalIds.length > 0) {
          const leagues = await prisma.leagues.findMany({
            where: {
              externalId: {
                in: leagueExternalIds.map((id) => BigInt(id)),
              },
            },
            select: { id: true },
          });
          leagueDbIds = leagues.map((l) => l.id);
        }
      }

      let countryDbIds: number[] | undefined;
      if (query.countryIds) {
        const countryExternalIds = query.countryIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (countryExternalIds.length > 0) {
          const countries = await prisma.countries.findMany({
            where: {
              externalId: {
                in: countryExternalIds.map((id) => BigInt(id)),
              },
            },
            select: { id: true },
          });
          countryDbIds = countries.map((c) => c.id);
        }
      }

      // Parse date filters (timestamps)
      const fromTs = query.fromTs ? Number(query.fromTs) : undefined;
      const toTs = query.toTs ? Number(query.toTs) : undefined;

      const { fixtures, count } = await service.get({
        take,
        skip,
        leagueId: query.leagueId,
        leagueIds: leagueDbIds,
        countryIds: countryDbIds,
        seasonId: query.seasonId,
        state: query.state,
        fromTs,
        toTs,
        orderBy: [{ startTs: "desc" }],
        include: Object.keys(include).length > 0 ? include : undefined,
      });

      return reply.send({
        status: "success",
        data: fixtures.map(mapFixtureToResponse),
        pagination: createPaginationResponse(page, perPage, count),
        message: "Fixtures fetched from database successfully",
      });
    }
  );

  // GET /admin/db/fixtures/:id - Get a single fixture by ID
  fastify.get<{
    Params: GetFixtureParams;
    Querystring: GetFixtureQuerystring;
    Reply: AdminFixtureResponse;
  }>(
    "/fixtures/:id",
    {
      schema: {
        params: getFixtureParamsSchema,
        querystring: getFixtureQuerystringSchema,
        response: {
          200: getFixtureResponseSchema,
          404: getFixture404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminFixtureResponse> => {
      const { id } = req.params;
      const { include } = req.query;

      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          message: getErrorMessage(error),
        } as any);
      }

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(include);
      const includeObj: Prisma.fixturesInclude = {
        scoreOverriddenBy: { select: { id: true, name: true, email: true } },
      };

      const teamSelect = {
        id: true,
        name: true,
        imagePath: true,
        externalId: true,
      };
      const leagueSelect = {
        id: true,
        name: true,
        imagePath: true,
        type: true,
        externalId: true,
      };
      const seasonSelect = { id: true, name: true, externalId: true };

      includeKeys.forEach((key) => {
        if (key === "homeTeam" || key === "awayTeam") {
          (includeObj as any)[key] = { select: teamSelect };
        } else if (key === "league") {
          (includeObj as any)[key] = { select: leagueSelect };
        } else if (key === "season") {
          (includeObj as any)[key] = { select: seasonSelect };
        }
      });

      try {
        const fixture = await service.getById(fixtureId, includeObj);

        return reply.send({
          status: "success",
          data: mapFixtureToResponse(fixture),
          message: "Fixture fetched from database successfully",
        });
      } catch (error: unknown) {
        if (
          (getErrorProp<number>(error, "status") ??
            getErrorProp<number>(error, "statusCode")) === 404
        ) {
          return reply.code(404).send({
            status: "error",
            message: getErrorMessage(error),
          } as any);
        }
        throw error;
      }
    }
  );

  // GET /admin/db/fixtures/search - Search fixtures
  fastify.get<{ Reply: AdminFixturesListResponse }>(
    "/fixtures/search",
    {
      schema: {
        querystring: searchFixturesQuerystringSchema,
        response: {
          200: searchFixturesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminFixturesListResponse> => {
      const query = req.query as SearchFixturesQuerystring;

      const take = query.take ?? 10;

      const fixtures = await service.search(query.q, take);

      return reply.send({
        status: "success",
        data: fixtures.map(mapFixtureToResponse),
        pagination: createPaginationResponse(1, take, fixtures.length),
        message: "Fixtures search completed successfully",
      });
    }
  );

  // PATCH /admin/db/fixtures/:id - Update a fixture
  fastify.patch<{
    Params: GetFixtureParams;
    Body: {
      name?: string;
      state?: string;
      homeScore?: number | null;
      awayScore?: number | null;
      result?: string | null;
    };
    Reply: AdminFixtureResponse;
  }>(
    "/fixtures/:id",
    {
      schema: {
        params: getFixtureParamsSchema,
        body: updateFixtureBodySchema,
        response: {
          200: updateFixtureResponseSchema,
          404: updateFixture404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminFixtureResponse> => {
      const { id } = req.params;
      const body = req.body;
      const overriddenById = req.adminAuth?.user?.id ?? null;

      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return reply.code(400).send({
          status: "error",
          message: getErrorMessage(error),
        } as any);
      }

      try {
        // Use the result from body if provided (including null)
        // Only build result from scores if result is not provided (undefined) AND both scores are non-null
        let result = body.result;
        if (
          result === undefined &&
          body.homeScore !== undefined &&
          body.awayScore !== undefined
        ) {
          // Only build result if both scores are non-null
          if (body.homeScore !== null && body.awayScore !== null) {
            result = `${body.homeScore}-${body.awayScore}`;
          } else {
            // If scores are null, set result to null
            result = null;
          }
        }
        // If result is explicitly null in body, keep it as null (don't rebuild from scores)

        const fixture = await service.update(fixtureId, {
          name: body.name,
          state: body.state,
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          result: result,
          overriddenById,
        });

        return reply.send({
          status: "success",
          data: mapFixtureToResponse(fixture),
          message: "Fixture updated successfully",
        });
      } catch (error: unknown) {
        if (
          (getErrorProp<number>(error, "status") ??
            getErrorProp<number>(error, "statusCode")) === 404
        ) {
          return reply.code(404).send({
            status: "error",
            message: getErrorMessage(error),
          } as any);
        }
        throw error;
      }
    }
  );
};

export default adminFixturesDbRoutes;
