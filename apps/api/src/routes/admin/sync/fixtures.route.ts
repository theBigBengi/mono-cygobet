// src/routes/admin/sync/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedFixtures } from "../../../etl/seeds/seed.fixtures";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { AdminSyncFixturesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin.schemas";

const adminSyncFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/fixtures - Sync fixtures from provider to database
  // Requires date range or seasonId in body
  fastify.post<{
    Body: { dryRun?: boolean; from?: string; to?: string; seasonId?: number };
    Reply: AdminSyncFixturesResponse;
  }>(
    "/fixtures",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            dryRun: { type: "boolean" },
            from: { type: "string" },
            to: { type: "string" },
            seasonId: { type: "number" },
          },
        },
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSyncFixturesResponse> => {
      const { dryRun = false, from, to, seasonId } = req.body ?? {};

      if (!seasonId && (!from || !to)) {
        return reply.code(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 0,
            total: 0,
          },
          message: "Either seasonId or both from and to dates are required",
        });
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      let fixturesDto: any[] = [];

      if (seasonId) {
        fixturesDto = await adapter.fetchFixturesBySeason(seasonId);
      } else if (from && to) {
        fixturesDto = await adapter.fetchFixturesBetween(from, to);
      }

      const result = await seedFixtures(fixturesDto, {
        dryRun,
        triggeredBy: "admin-ui",
      });

      return reply.send({
        status: "success",
        data: {
          batchId: result.batchId,
          ok: result.ok,
          fail: result.fail,
          total: result.total,
        },
        message: dryRun
          ? "Fixtures sync dry-run completed"
          : "Fixtures synced successfully from provider to database",
      });
    }
  );

  // POST /admin/sync/fixtures/:id - Sync a single fixture by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncFixturesResponse;
  }>(
    "/fixtures/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSyncFixturesResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};

      const fixtureId = Number(id);
      if (isNaN(fixtureId)) {
        return reply.status(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Invalid fixture ID: ${id}`,
        });
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const fixtureDto = await adapter.fetchFixtureById(fixtureId);

      if (!fixtureDto) {
        return reply.code(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Fixture with ID ${fixtureId} not found in provider`,
        });
      }

      const result = await seedFixtures([fixtureDto], {
        dryRun,
        triggeredBy: "admin-ui",
      });

      return reply.send({
        status: "success",
        data: {
          batchId: result.batchId,
          ok: result.ok,
          fail: result.fail,
          total: result.total,
        },
        message: dryRun
          ? `Fixture sync dry-run completed for ID ${fixtureId}`
          : `Fixture synced successfully from provider to database (ID: ${fixtureId})`,
      });
    }
  );
};

export default adminSyncFixturesRoutes;
