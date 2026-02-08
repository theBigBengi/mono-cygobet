import { FastifyPluginAsync } from "fastify";
import { RunTrigger } from "@repo/db";
import { startSeedBatch } from "../../../../etl/seeds/seed.utils";
import { processSeedSeason } from "../../../../jobs/seed-season.job";
import type {
  AdminSeedSeasonRequest,
  AdminSeedSeasonResponse,
} from "@repo/types";

const seedSeasonRoutes: FastifyPluginAsync = async (fastify) => {
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
            seasonExternalId: { type: "number" },
            includeTeams: { type: "boolean" },
            includeFixtures: { type: "boolean" },
            dryRun: { type: "boolean" },
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
        dryRun = false,
      } = (req.body ?? {}) as AdminSeedSeasonRequest;

      if (seasonExternalId == null || typeof seasonExternalId !== "number") {
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
            dryRun,
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
            dryRun,
            batchId: batch.id,
            triggeredBy: (req as { user?: { id?: string } }).user?.id
              ? "user"
              : null,
            triggeredById: (req as { user?: { id?: string } }).user?.id ?? null,
          }).catch(() => {
            // Error already handled in processSeedSeason (finishSeedBatch)
          });
        });

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
