import { FastifyPluginAsync } from "fastify";
import type {
  AdminJobsListResponse,
  AdminUpdateJobResponse,
} from "@repo/types";
import { AdminJobsConfigService } from "../../../services/admin/jobs-config.service";
import { AppError } from "../../../utils/errors";
import {
  listJobsResponseSchema,
  updateJobBodySchema,
  updateJobParamsSchema,
  updateJobResponseSchema,
} from "../../../schemas/admin/jobs.schemas";

/**
 * Admin Jobs DB Routes
 * -------------------
 * Database-backed job configuration and listing:
 *
 * Mounted under `/admin/jobs` by Fastify autoload folder prefix.
 *
 * - GET   /admin/jobs
 * - PATCH /admin/jobs/:jobId
 */
const adminJobsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminJobsConfigService(fastify);

  // GET /admin/jobs - List jobs from database (plus derived last run + runnable flag)
  fastify.get<{ Reply: AdminJobsListResponse }>(
    "/",
    {
      schema: {
        response: {
          200: listJobsResponseSchema,
        },
      },
    },
    async (_req, reply): Promise<AdminJobsListResponse> => {
      const data = await service.listJobs();
      return reply.send({
        status: "success",
        data,
        message: "Jobs fetched successfully",
      });
    }
  );

  // PATCH /admin/jobs/:jobId - Update job fields (description/enabled/scheduleCron)
  fastify.patch<{
    Params: { jobId: string };
    Body: {
      description?: string | null;
      enabled?: boolean;
      scheduleCron?: string | null;
      meta?: Record<string, unknown> | null;
    };
    Reply: AdminUpdateJobResponse;
  }>(
    "/:jobId",
    {
      schema: {
        params: updateJobParamsSchema,
        body: updateJobBodySchema,
        response: {
          200: updateJobResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminUpdateJobResponse> => {
      const { jobId } = req.params;
      const body = req.body ?? {};
      try {
        const data = await service.updateJob({ jobId, patch: body });
        return reply.send({
          status: "success",
          data,
          message: "Job updated successfully",
        });
      } catch (e: unknown) {
        if (e instanceof AppError) {
          return reply.status(e.status).send({
            status: "error",
            data: null,
            message: e.message,
          } as unknown as AdminUpdateJobResponse);
        }
        throw e;
      }
    }
  );
};

console.log("REGISTERING adminJobsDbRoutes");
export default adminJobsDbRoutes;
