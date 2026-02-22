// src/routes/admin/fixtures/fixtures.route.ts
// Mounted under /admin/fixtures by Fastify autoload.

import { FastifyPluginAsync } from "fastify";
import { parseId } from "../../../utils/routes";
import { getErrorMessage, getErrorProp } from "../../../utils/error.utils";
import {
  resettleFixture,
  getGroupsSummary,
} from "../../../services/admin/fixtures.service";
import { getFixturesNeedingAttention } from "../../../services/admin/fixtures-attention.service";
import { getFixtureIssue } from "../../../services/admin/dashboard.service";
import { prisma } from "@repo/db";
import type { FixtureIssueType } from "@repo/types";

const adminFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/fixtures/attention - Fixtures needing admin attention
  fastify.get(
    "/attention",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            issueType: {
              type: "string",
              enum: ["all", "stuck", "overdue", "noScores", "unsettled"],
            },
            search: { type: "string" },
            timeframe: {
              type: "string",
              enum: ["all", "1h", "3h", "6h", "12h", "24h", "24h+"],
            },
            leagueId: { type: "number" },
            page: { type: "number", minimum: 1 },
            perPage: { type: "number", minimum: 1, maximum: 100 },
          },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as {
        issueType?: FixtureIssueType | "all";
        search?: string;
        timeframe?: string;
        leagueId?: number;
        page?: number;
        perPage?: number;
      };
      const result = await getFixturesNeedingAttention({
        issueType: query.issueType,
        search: query.search,
        timeframe: query.timeframe as any,
        leagueId: query.leagueId,
        page: query.page,
        perPage: query.perPage,
      });
      return reply.send(result);
    }
  );

  // GET /admin/fixtures/search - Search fixtures by name/team with pagination
  fastify.get(
    "/search",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            q: { type: "string", minLength: 2 },
            page: { type: "number", minimum: 1 },
            perPage: { type: "number", minimum: 1, maximum: 100 },
          },
          required: ["q"],
        },
      },
    },
    async (req, reply) => {
      const { q, page = 1, perPage = 25 } = req.query as {
        q: string;
        page?: number;
        perPage?: number;
      };

      const matchedFixtures = await prisma.fixtures.findMany({
        where: {
          name: { contains: q, mode: "insensitive" },
          externalId: { gte: 0 },
        },
        select: {
          id: true,
          name: true,
          externalId: true,
          startIso: true,
          startTs: true,
          state: true,
          result: true,
          homeScore90: true,
          awayScore90: true,
          updatedAt: true,
          homeTeam: { select: { id: true, name: true, imagePath: true } },
          awayTeam: { select: { id: true, name: true, imagePath: true } },
          league: { select: { id: true, name: true, imagePath: true } },
        },
        orderBy: { startTs: "desc" },
        take: perPage,
        skip: (page - 1) * perPage,
      });

      const totalCount = await prisma.fixtures.count({
        where: {
          name: { contains: q, mode: "insensitive" },
          externalId: { gte: 0 },
        },
      });

      const data = await Promise.all(
        matchedFixtures.map(async (f) => {
          const issue = await getFixtureIssue(f);
          return {
            id: f.id,
            name: f.name,
            externalId: f.externalId.toString(),
            startIso: f.startIso,
            startTs: f.startTs,
            state: f.state,
            result: f.result,
            homeScore90: f.homeScore90,
            awayScore90: f.awayScore90,
            homeTeam: f.homeTeam,
            awayTeam: f.awayTeam,
            league: f.league,
            issue,
          };
        })
      );

      return reply.send({
        status: "success",
        data,
        pagination: {
          page,
          perPage,
          totalItems: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
        },
        message: `Found ${totalCount} fixture(s) matching "${q}"`,
      });
    }
  );

  // POST /admin/fixtures/:id/resettle - Re-settle predictions for a FT fixture
  fastify.post(
    "/:id/resettle",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              groupsAffected: { type: "number" },
              predictionsRecalculated: { type: "number" },
            },
            required: ["groupsAffected", "predictionsRecalculated"],
          },
          400: {
            type: "object",
            properties: { message: { type: "string" } },
          },
          404: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return (reply as any).code(400).send({
          message: getErrorMessage(error),
        });
      }
      try {
        const result = await resettleFixture(fixtureId);
        return reply.send(result);
      } catch (error: unknown) {
        const code =
          getErrorProp<number>(error, "statusCode") ??
          getErrorProp<number>(error, "status");
        if (code === 400 || code === 404) {
          return (reply as any).code(code).send({
            message: getErrorMessage(error),
          });
        }
        throw error;
      }
    }
  );

  // GET /admin/fixtures/:id/settlement - Groups summary for a fixture
  fastify.get(
    "/:id/settlement",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              totalGroups: { type: "number" },
              totalPredictions: { type: "number" },
              settledPredictions: { type: "number" },
              unsettledPredictions: { type: "number" },
            },
            required: [
              "totalGroups",
              "totalPredictions",
              "settledPredictions",
              "unsettledPredictions",
            ],
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      let fixtureId: number;
      try {
        fixtureId = parseId(id);
      } catch (error: unknown) {
        return (reply as any).code(400).send({
          message: getErrorMessage(error),
        });
      }
      const summary = await getGroupsSummary(fixtureId);
      return reply.send(summary);
    }
  );
};

export default adminFixturesRoutes;
