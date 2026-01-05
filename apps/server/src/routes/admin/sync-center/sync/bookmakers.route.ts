// src/routes/admin/sync/bookmakers.route.ts
import { FastifyPluginAsync } from "fastify";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { seedBookmakers } from "../../../../etl/seeds/seed.bookmakers";
import { AdminSyncBookmakersResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../../schemas/admin/admin.schemas";

const adminSyncBookmakersRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/bookmakers - Sync bookmakers from provider to database
  fastify.post<{
    Body: { dryRun?: boolean };
    Reply: AdminSyncBookmakersResponse;
  }>(
    "/bookmakers",
    {
      schema: {
        body: syncBodySchema,
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSyncBookmakersResponse> => {
      const { dryRun = false } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });
      const bookmakersDto = await adapter.fetchBookmakers();
      const result = await seedBookmakers(bookmakersDto, { 
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
          ? "Bookmakers sync dry-run completed"
          : "Bookmakers synced successfully from provider to database",
      });
    }
  );

  // POST /admin/sync/bookmakers/:id - Sync a single bookmaker by ID from provider to database
  fastify.post<{
    Params: { id: string };
    Body: { dryRun?: boolean };
    Reply: AdminSyncBookmakersResponse;
  }>(
    "/bookmakers/:id",
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
    async (req, reply): Promise<AdminSyncBookmakersResponse> => {
      const { id } = req.params;
      const { dryRun = false } = req.body ?? {};

      const bookmakerId = Number(id);
      if (isNaN(bookmakerId)) {
        return reply.status(400).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Invalid bookmaker ID: ${id}`,
        });
      }

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      const bookmakersDto = await adapter.fetchBookmakers();
      const bookmakerDto = bookmakersDto.find(
        (b) => b.externalId === bookmakerId
      );

      if (!bookmakerDto) {
        return reply.status(404).send({
          status: "error",
          data: {
            batchId: null,
            ok: 0,
            fail: 1,
            total: 1,
          },
          message: `Bookmaker with ID ${bookmakerId} not found in provider`,
        });
      }

      const result = await seedBookmakers([bookmakerDto], { 
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
          ? `Bookmaker sync dry-run completed for ID ${bookmakerId}`
          : `Bookmaker synced successfully from provider to database (ID: ${bookmakerId})`,
      });
    }
  );
};

export default adminSyncBookmakersRoutes;

