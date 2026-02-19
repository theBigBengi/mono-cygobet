import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { RunStatus } from "@repo/db";
import type { AdminJobStatusResponse } from "@repo/types";

function mapBatchStatusToState(
  status: RunStatus
): "waiting" | "active" | "completed" | "failed" {
  switch (status) {
    case RunStatus.queued:
      return "waiting";
    case RunStatus.running:
      return "active";
    case RunStatus.success:
    case RunStatus.skipped:
      return "completed";
    case RunStatus.failed:
      return "failed";
    default:
      return "active";
  }
}

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  // Reply typed as any to support both single seed and batch seed response shapes
  fastify.get<{
    Params: { jobId: string };
  }>(
    "/:jobId/status",
    {
      schema: {
        params: {
          type: "object",
          required: ["jobId"],
          properties: { jobId: { type: "string" } },
        },
        // No response schema — use default JSON.stringify to avoid
        // fast-json-stringify stripping nested objects from the seasons array
        response: {
          404: {
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
      const jobId = req.params.jobId;
      const id = Number(jobId);
      if (Number.isNaN(id) || id < 1) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid jobId",
        } as unknown as AdminJobStatusResponse);
      }

      const batch = await prisma.seedBatches.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          status: true,
          meta: true,
          errorMessage: true,
          itemsTotal: true,
          itemsSuccess: true,
          itemsFailed: true,
        },
      });

      if (!batch) {
        return reply.status(404).send({
          status: "error",
          message: "Job not found",
        } as unknown as AdminJobStatusResponse);
      }

      const state = mapBatchStatusToState(batch.status);
      const meta = (batch.meta ?? {}) as Record<string, unknown>;

      const progress =
        batch.itemsTotal > 0
          ? Math.round(
              (((batch.itemsSuccess ?? 0) + (batch.itemsFailed ?? 0)) /
                batch.itemsTotal) *
                100
            )
          : undefined;

      // Batch seed response — includes per-season progress
      if (batch.name === "batch-seed-seasons") {
        const totalSeasons = (meta.totalSeasons as number) ?? 0;
        const completedSeasons = (meta.completedSeasons as number) ?? 0;
        const failedSeasons = (meta.failedSeasons as number) ?? 0;
        const seasons = (meta.seasons as unknown[]) ?? [];
        const batchProgress =
          totalSeasons > 0
            ? Math.round(((completedSeasons + failedSeasons) / totalSeasons) * 100)
            : 0;

        return reply.send({
          status: "ok",
          data: {
            jobId: String(batch.id),
            state,
            progress: batchProgress,
            totalSeasons,
            completedSeasons,
            failedSeasons,
            seasons,
            ...(batch.errorMessage && { error: batch.errorMessage }),
          },
        });
      }

      // Single seed-season response
      const result =
        state === "completed" && meta
          ? {
              season: meta.season as NonNullable<
                AdminJobStatusResponse["data"]["result"]
              >["season"],
              teams: meta.teams as NonNullable<
                AdminJobStatusResponse["data"]["result"]
              >["teams"],
              fixtures: meta.fixtures as NonNullable<
                AdminJobStatusResponse["data"]["result"]
              >["fixtures"],
            }
          : undefined;

      return reply.send({
        status: "ok",
        data: {
          jobId: String(batch.id),
          state,
          ...(progress != null && { progress }),
          ...(result && { result }),
          ...(batch.errorMessage && { error: batch.errorMessage }),
        },
      });
    }
  );
};

export default jobsRoutes;
