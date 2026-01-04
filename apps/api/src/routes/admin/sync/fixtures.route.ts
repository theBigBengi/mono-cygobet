// src/routes/admin/sync/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { seedFixtures } from "../../../etl/seeds/seed.fixtures";
import SportMonksAdapter from "@repo/sports-data/adapters/sportmonks";
import { AdminSyncFixturesResponse } from "@repo/types";
import {
  syncBodySchema,
  syncResponseSchema,
} from "../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminSyncFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /admin/sync/fixtures - Sync fixtures from provider to database
  // Requires date range or seasonId in body
  fastify.post<{
    Body: {
      dryRun?: boolean;
      from?: string;
      to?: string;
      seasonId?: number;
      fetchAllFixtureStates?: boolean;
    };
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
            fetchAllFixtureStates: { type: "boolean" },
          },
        },
        response: {
          200: syncResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminSyncFixturesResponse> => {
      const {
        dryRun = false,
        from,
        to,
        seasonId,
        fetchAllFixtureStates = true,
      } = req.body ?? {};

      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

      let allFixturesDto: any[] = [];
      let totalOk = 0;
      let totalFail = 0;
      let totalTotal = 0;
      let lastBatchId: number | null = null;

      if (seasonId) {
        // Single season
        const fixturesDto = await adapter.fetchFixturesBySeason(seasonId, {
          fixtureStates: fetchAllFixtureStates ? undefined : "1",
        });
        allFixturesDto = fixturesDto;
      } else if (from && to) {
        // Date range
        const fixturesDto = await adapter.fetchFixturesBetween(from, to, {
          filters: fetchAllFixtureStates
            ? undefined
            : { fixtureStates: "1" },
        });
        allFixturesDto = fixturesDto;
      } else {
        // Fetch all seasons from database and seed fixtures for each
        const dbSeasons = await prisma.seasons.findMany({
          select: { externalId: true },
          orderBy: { name: "asc" },
        });

        if (dbSeasons.length === 0) {
          return reply.code(400).send({
            status: "error",
            data: {
              batchId: null,
              ok: 0,
              fail: 0,
              total: 0,
            },
            message: "No seasons found in database. Please sync seasons first.",
          });
        }

        // Fetch fixtures for each season
        for (const season of dbSeasons) {
          try {
            const fixturesDto = await adapter.fetchFixturesBySeason(
              Number(season.externalId),
              {
                fixtureStates: fetchAllFixtureStates ? undefined : "1",
              }
            );
            if (fixturesDto.length > 0) {
              const result = await seedFixtures(fixturesDto, {
                dryRun,
                triggeredBy: "admin-ui",
              });
              totalOk += result.ok;
              totalFail += result.fail;
              totalTotal += result.total;
              if (result.batchId) {
                lastBatchId = result.batchId;
              }
            }
          } catch (error) {
            // Continue with other seasons even if one fails
            totalFail += 1;
            totalTotal += 1;
          }
        }

        return reply.send({
          status: "success",
          data: {
            batchId: lastBatchId,
            ok: totalOk,
            fail: totalFail,
            total: totalTotal,
          },
          message: dryRun
            ? `Fixtures sync dry-run completed for ${dbSeasons.length} seasons`
            : `Fixtures synced successfully from provider to database for ${dbSeasons.length} seasons`,
        });
      }

      // Single batch for seasonId or date range
      const result = await seedFixtures(allFixturesDto, {
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
