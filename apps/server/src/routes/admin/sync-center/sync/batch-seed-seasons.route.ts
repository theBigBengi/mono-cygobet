import { FastifyPluginAsync } from "fastify";
import { RunTrigger } from "@repo/db";
import { startSeedBatch } from "../../../../etl/seeds/seed.utils";
import { processBatchSeedSeasons } from "../../../../jobs/tasks/batch-seed-seasons.job";
import type {
  AdminBatchSeedSeasonsRequest,
  AdminBatchSeedSeasonsResponse,
} from "@repo/types";

const MAX_SEASONS_PER_BATCH = 50;

const batchSeedSeasonsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: AdminBatchSeedSeasonsRequest;
    Reply: AdminBatchSeedSeasonsResponse;
  }>(
    "/batch-seed-seasons",
    {
      schema: {
        body: {
          type: "object",
          required: ["seasonExternalIds"],
          properties: {
            seasonExternalIds: {
              type: "array",
              items: { type: "number" },
              minItems: 1,
              maxItems: MAX_SEASONS_PER_BATCH,
            },
            includeTeams: { type: "boolean" },
            includeFixtures: { type: "boolean" },
            futureOnly: { type: "boolean" },
          },
        },
      },
    },
    async (req, reply) => {
      const {
        seasonExternalIds,
        includeTeams = true,
        includeFixtures = true,
        futureOnly = true,
      } = req.body;

      if (
        !Array.isArray(seasonExternalIds) ||
        seasonExternalIds.length === 0
      ) {
        return reply.status(400).send({
          status: "error",
          message: "seasonExternalIds must be a non-empty array",
        } as unknown as AdminBatchSeedSeasonsResponse);
      }

      if (seasonExternalIds.length > MAX_SEASONS_PER_BATCH) {
        return reply.status(400).send({
          status: "error",
          message: `Maximum ${MAX_SEASONS_PER_BATCH} seasons per batch`,
        } as unknown as AdminBatchSeedSeasonsResponse);
      }

      const userId = (req as { user?: { id?: string } }).user?.id ?? null;

      try {
        const batch = await startSeedBatch(
          "batch-seed-seasons",
          "1.0",
          {
            seasonExternalIds,
            includeTeams,
            includeFixtures,
            futureOnly,
            totalSeasons: seasonExternalIds.length,
            seasons: seasonExternalIds.map((id) => ({
              seasonExternalId: id,
              status: "pending",
            })),
          },
          {
            trigger: RunTrigger.manual,
            triggeredBy: userId ? "user" : null,
            triggeredById: userId,
          }
        );

        const jobId = String(batch.id);

        setImmediate(() => {
          processBatchSeedSeasons({
            batchId: Number(batch.id),
            seasonExternalIds,
            includeTeams,
            includeFixtures,
            futureOnly,
            triggeredBy: userId ? "user" : null,
            triggeredById: userId,
          }).catch(() => {
            // Error already handled in processBatchSeedSeasons (finishSeedBatch)
          });
        });

        return reply.send({
          status: "ok",
          data: {
            jobId,
            totalSeasons: seasonExternalIds.length,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to start batch seed";
        return reply.status(500).send({
          status: "error",
          message,
        } as unknown as AdminBatchSeedSeasonsResponse);
      }
    }
  );
};

export default batchSeedSeasonsRoutes;
