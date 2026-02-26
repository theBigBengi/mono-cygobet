import { FastifyPluginAsync } from "fastify";
import { prisma, RunTrigger } from "@repo/db";
import { startSeedBatch } from "../../../../etl/seeds/seed.utils";
import { processSeedSeason } from "../../../../jobs/tasks/seed-season.job";
import { adapter } from "../../../../utils/adapter";
import type {
  AdminSeedSeasonRequest,
  AdminSeedSeasonResponse,
  AdminSeedSeasonPreviewRequest,
  AdminSeedSeasonPreviewResponse,
} from "@repo/types";
import { auditFromRequest } from "../../../../services/admin/audit-log.service";

const seedSeasonRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /seed-season/preview - Check what will be created
  fastify.get<{
    Querystring: AdminSeedSeasonPreviewRequest;
    Reply: AdminSeedSeasonPreviewResponse;
  }>(
    "/seed-season/preview",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["seasonExternalId"],
          properties: {
            seasonExternalId: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const seasonExternalId = req.query.seasonExternalId;

      if (!seasonExternalId) {
        return reply.status(400).send({
          status: "error",
          message: "seasonExternalId is required",
        } as unknown as AdminSeedSeasonPreviewResponse);
      }

      try {
        // Fetch all preview data in a single optimized API call
        const preview = await adapter.fetchSeasonPreview(seasonExternalId);
        if (!preview) {
          return reply.status(404).send({
            status: "error",
            message: `Season ${seasonExternalId} not found in provider`,
          } as unknown as AdminSeedSeasonPreviewResponse);
        }

        // Check what exists in DB (parallel queries)
        const [existingSeason, existingLeague, existingCountry] =
          await Promise.all([
            prisma.seasons.findUnique({
              where: { externalId: String(preview.season.externalId) },
            }),
            preview.league.externalId
              ? prisma.leagues.findUnique({
                  where: { externalId: String(preview.league.externalId) },
                })
              : null,
            preview.country.externalId
              ? prisma.countries.findUnique({
                  where: { externalId: String(preview.country.externalId) },
                })
              : null,
          ]);

        return reply.send({
          status: "ok",
          data: {
            season: {
              externalId: preview.season.externalId,
              name: preview.season.name,
              exists: !!existingSeason,
            },
            league: {
              externalId: preview.league.externalId,
              name: preview.league.name,
              exists: !!existingLeague,
            },
            country: {
              externalId: preview.country.externalId,
              name: preview.country.name,
              exists: !!existingCountry,
            },
            counts: {
              teams: preview.teamsCount,
              fixtures: preview.fixturesCount,
              fixturesFuture: preview.fixturesCountFuture,
            },
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to get preview";
        return reply.status(500).send({
          status: "error",
          message,
        } as unknown as AdminSeedSeasonPreviewResponse);
      }
    }
  );

  fastify.post<{
    Body: AdminSeedSeasonRequest;
    Reply: AdminSeedSeasonResponse;
  }>(
    "/seed-season",
    {
      schema: {
        body: {
          type: "object",
          required: ["seasonExternalId"],
          properties: {
            seasonExternalId: { type: "string" },
            includeTeams: { type: "boolean" },
            includeFixtures: { type: "boolean" },
            futureOnly: { type: "boolean" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string", const: "ok" },
              data: {
                type: "object",
                properties: {
                  jobId: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
          400: {
            type: "object",
            properties: {
              status: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const {
        seasonExternalId,
        includeTeams = true,
        includeFixtures = true,
        futureOnly = true,
      } = (req.body ?? {}) as AdminSeedSeasonRequest;

      if (seasonExternalId == null || typeof seasonExternalId !== "string") {
        return reply.status(400).send({
          status: "error",
          message: "seasonExternalId is required",
        } as unknown as AdminSeedSeasonResponse);
      }

      try {
        const batch = await startSeedBatch(
          "seed-season",
          "1.0",
          {
            seasonExternalId,
            includeTeams,
            includeFixtures,
            futureOnly,
          },
          {
            trigger: RunTrigger.manual,
            triggeredBy: (req as { user?: { id?: string } }).user?.id
              ? "user"
              : null,
            triggeredById: (req as { user?: { id?: string } }).user?.id ?? null,
          }
        );

        const jobId = String(batch.id);

        setImmediate(() => {
          processSeedSeason({
            seasonExternalId,
            includeTeams,
            includeFixtures,
            futureOnly,
            batchId: batch.id,
            triggeredBy: (req as { user?: { id?: string } }).user?.id
              ? "user"
              : null,
            triggeredById: (req as { user?: { id?: string } }).user?.id ?? null,
          }).catch(() => {
            // Error already handled in processSeedSeason (finishSeedBatch)
          });
        });

        auditFromRequest(req, reply, { action: "sync.seed-season", category: "sync", description: `Seed season queued for ${seasonExternalId}`, metadata: { seasonExternalId, includeTeams, includeFixtures, futureOnly, jobId } });
        return reply.send({
          status: "ok",
          data: {
            jobId,
            message: "Seed season job queued",
          },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to queue seed season";
        return reply
          .status(500)
          .send({
            status: "error",
            message,
          } as unknown as AdminSeedSeasonResponse);
      }
    }
  );
};

export default seedSeasonRoutes;
