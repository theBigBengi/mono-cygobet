import { FastifyPluginAsync } from "fastify";
import { HealthResponse } from "../types/health";
import { prisma, RunStatus } from "@repo/db";
import { healthResponseSchema } from "../schemas/health.schemas";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });

  fastify.get("/health/db", async () => {
    const result = await prisma.$queryRaw`SELECT 1`;
    return { status: "db-ok", result };
  });

  fastify.get("/health/scheduler", async () => {
    const allJobs = await prisma.jobs.findMany({
      select: { key: true, enabled: true, scheduleCron: true },
    });

    const jobKeys = allJobs.map((j) => j.key);

    // Get latest run per job key in one query
    const latestRuns = jobKeys.length > 0
      ? await prisma.jobRuns.findMany({
          where: { jobKey: { in: jobKeys } },
          orderBy: { startedAt: "desc" },
          distinct: ["jobKey"],
          select: { jobKey: true, startedAt: true, status: true },
        })
      : [];

    const latestByKey = new Map(latestRuns.map((r) => [r.jobKey, r]));

    let hasNeverRan = false;
    let hasLastFailed = false;

    const jobs: Record<
      string,
      {
        lastRunAt: string | null;
        lastStatus: string | null;
        enabled: boolean;
        scheduleCron: string | null;
      }
    > = {};

    for (const job of allJobs) {
      const latest = latestByKey.get(job.key);
      jobs[job.key] = {
        lastRunAt: latest?.startedAt?.toISOString() ?? null,
        lastStatus: latest?.status ?? null,
        enabled: job.enabled,
        scheduleCron: job.scheduleCron,
      };

      if (job.enabled) {
        if (!latest) hasNeverRan = true;
        else if (latest.status === RunStatus.failed) hasLastFailed = true;
      }
    }

    const status = hasNeverRan ? "error" : hasLastFailed ? "degraded" : "ok";

    return {
      status,
      timestamp: new Date().toISOString(),
      jobs,
    };
  });
};

export default healthRoutes;
