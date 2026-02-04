// src/routes/admin/db/odds.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { AdminOddsListResponse } from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseIncludeString,
} from "../../../../utils/routes";
import {
  listOddsQuerystringSchema,
  listOddsResponseSchema,
} from "../../../../schemas/admin/odds.schemas";
import type { ListOddsQuerystring } from "../../../../types/odds";
import { OddsService } from "../../../../services/odds.service";

const adminOddsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new OddsService(fastify);

  // GET /admin/db/odds - List odds from database
  fastify.get<{ Reply: AdminOddsListResponse }>(
    "/odds",
    {
      schema: {
        querystring: listOddsQuerystringSchema,
        response: {
          200: listOddsResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminOddsListResponse> => {
      const query = req.query as ListOddsQuerystring;
      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.oddsInclude = {};
      includeKeys.forEach((key) => {
        if (key === "bookmaker") {
          (include as any).bookmakers = true;
        } else if (key === "fixture") {
          (include as any).fixtures = {
            select: {
              id: true,
              name: true,
              startIso: true,
              startTs: true,
              leagueId: true,
              seasonId: true,
              homeTeamId: true,
              awayTeamId: true,
              externalId: true,
            },
          };
        }
      });

      // Always include fixture + bookmaker for response rendering (name/externalId)
      const includeWithRelations: Prisma.oddsInclude = {
        ...include,
        fixtures: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
        bookmakers: {
          select: {
            id: true,
            name: true,
            externalId: true,
          },
        },
      };

      // Parse filters (external IDs in query) and map to DB IDs
      const fixtureExternalIds =
        query.fixtureIds
          ?.split(",")
          .map((id) => id.trim())
          .filter(Boolean) || [];
      const bookmakerExternalIds =
        query.bookmakerIds
          ?.split(",")
          .map((id) => id.trim())
          .filter(Boolean) || [];
      const marketIds =
        query.marketIds
          ?.split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .map(Number)
          .filter(Number.isFinite) || [];

      let fixtureDbIds: number[] | undefined;
      if (fixtureExternalIds.length > 0) {
        const fixtures = await prisma.fixtures.findMany({
          where: {
            externalId: {
              in: fixtureExternalIds.map((id) => BigInt(id)),
            },
          },
          select: { id: true },
        });
        fixtureDbIds = fixtures.map((f) => f.id);
      }

      let bookmakerDbIds: number[] | undefined;
      if (bookmakerExternalIds.length > 0) {
        const bookmakers = await prisma.bookmakers.findMany({
          where: {
            externalId: { in: bookmakerExternalIds.map((id) => BigInt(id)) },
          },
          select: { id: true },
        });
        bookmakerDbIds = bookmakers.map((b) => b.id);
      }

      const { odds, count } = await service.get({
        take,
        skip,
        fixtureIds: fixtureDbIds,
        bookmakerIds: bookmakerDbIds,
        marketIds,
        winning: query.winning,
        fromTs: query.fromTs,
        toTs: query.toTs,
        include: includeWithRelations,
      });

      const data = odds.map((o) => {
        const ox = o as any;
        return {
          id: o.id,
          externalId: o.externalId.toString(),
          fixtureId: o.fixtureId,
          fixtureExternalId: ox.fixtures?.externalId?.toString() ?? "",
          fixtureName: ox.fixtures?.name ?? null,
          bookmakerId: o.bookmakerId ?? null,
          bookmakerExternalId: ox.bookmakers?.externalId?.toString() ?? null,
          bookmakerName: ox.bookmakers?.name ?? null,
          marketExternalId: o.marketExternalId.toString(),
          marketName: o.marketName ?? null,
          marketDescription: o.marketDescription,
          sortOrder: o.sortOrder,
          label: o.label,
          name: o.name ?? null,
          handicap: o.handicap ?? null,
          total: o.total ?? null,
          value: o.value,
          probability: o.probability ?? null,
          winning: o.winning,
          startingAt: o.startingAt,
          startingAtTimestamp: o.startingAtTimestamp,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        };
      });

      return reply.send({
        status: "success",
        data,
        pagination: createPaginationResponse(page, perPage, count),
        message: "Odds fetched from database successfully",
      });
    }
  );
};

export default adminOddsDbRoutes;
