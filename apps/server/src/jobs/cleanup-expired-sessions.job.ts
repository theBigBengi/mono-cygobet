import type { FastifyInstance } from "fastify";
import type { JobRunOpts } from "../types/jobs";
import { CLEANUP_EXPIRED_SESSIONS_JOB } from "./jobs.definitions";
import { runJob } from "./run-job";
import { prisma } from "@repo/db";

export const cleanupExpiredSessionsJob = CLEANUP_EXPIRED_SESSIONS_JOB;

export async function runCleanupExpiredSessionsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<{ deleted: number }> {
  return runJob({
    jobKey: cleanupExpiredSessionsJob.key,
    loggerName: "CleanupExpiredSessionsJob",
    opts,
    skippedResult: { deleted: 0 },
    run: async () => {
      const res = await prisma.sessions.deleteMany({
        where: { expires: { lt: new Date() } },
      });
      const deleted = res.count ?? 0;
      return {
        result: { deleted },
        rowsAffected: deleted,
        meta: { deleted },
      };
    },
  });
}
