// src/routes/admin/sync/seasons.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedSeasons } from "../../../../etl/seeds/seed.seasons";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { AdminSyncSeasonsResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../../schemas/admin/admin.schemas";

const adminSyncSeasonsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/seasons - Sync seasons from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncSeasonsResponse;
  }>(
    "/seasons",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSyncSeasonsResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const seasonsDto = await adapter.fetchSeasons();

      const result = await seedSeasons(seasonsDto, { 
        dryRun,
        triggeredBy: "admin-ui"
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
          ? "Seasons sync dry-run completed"
          : "Seasons synced successfully from provider to database",
      });
    }
  );

  // POST /admin/sync/seasons/:id - Sync a single season by ID
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncSeasonsResponse;
  }>(
    "/seasons/:id",
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
    async (req, reply): Promise<AdminSyncSeasonsResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};

      const seasonId = parseInt(id, 10);
      if (isNaN(seasonId)) {
        return reply.code(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: "Invalid season ID",
        } as any);
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const seasonDto = await adapter.fetchSeasonById(seasonId);

      if (!seasonDto) {
        return reply.code(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Season with ID ${seasonId} not found in provider`,
        } as any);
      }

      const result = await seedSeasons([seasonDto], { 
        dryRun,
        triggeredBy: "admin-ui"
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
          ? "Season sync dry-run completed"
          : "Season synced successfully from provider to database",
      });
    }
  );
};

export default adminSyncSeasonsRoutes;
