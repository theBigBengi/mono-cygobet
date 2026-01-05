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
 * - GET   /admin/db/jobs
 * - PATCH /admin/db/jobs/:jobId
 */
const adminJobsDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new AdminJobsConfigService(fastify);

  // GET /admin/db/jobs - List jobs from database (plus derived last run + runnable flag)
  fastify.get<{ Reply: AdminJobsListResponse }>(
    "/jobs",
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

  // PATCH /admin/db/jobs/:jobId - Update job fields (description/enabled/scheduleCron)
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
    "/jobs/:jobId",
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
          return reply.status(e.statusCode).send({
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

export default adminJobsDbRoutes;
