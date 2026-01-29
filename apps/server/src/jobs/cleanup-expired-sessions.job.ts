import type { FastifyInstance } from "fastify";
import { JobTriggerBy } from "@repo/db";
import type { JobRunOpts } from "../types/jobs";
import {
  finishJobRunFailed,
  finishJobRunSuccess,
  getJobRowOrThrow,
  startJobRun,
} from "./jobs.db";
import { CLEANUP_EXPIRED_SESSIONS_JOB } from "./jobs.definitions";
import { getLogger } from "../logger";
import { prisma } from "@repo/db";

const log = getLogger("CleanupExpiredSessionsJob");

export const cleanupExpiredSessionsJob = CLEANUP_EXPIRED_SESSIONS_JOB;

export async function runCleanupExpiredSessionsJob(
  fastify: FastifyInstance,
  opts: JobRunOpts = {}
): Promise<{ deleted: number }> {
  const jobRow = await getJobRowOrThrow(cleanupExpiredSessionsJob.key);

  const jobRun = await startJobRun({
    jobKey: cleanupExpiredSessionsJob.key,
    trigger: opts.trigger ?? (opts.triggeredBy === JobTriggerBy.cron_scheduler ? "auto" : "manual"),
    triggeredBy: opts.triggeredBy ?? null,
    triggeredById: opts.triggeredById ?? null,
    meta: { ...(opts.meta ?? {}) },
  });
  const startedAtMs = jobRun.startedAtMs;

  try {
    const now = new Date();
    const res = await prisma.sessions.deleteMany({
      where: { expires: { lt: now } },
    });

    const deleted = res.count ?? 0;

    await finishJobRunSuccess({
      id: jobRun.id,
      startedAtMs,
      rowsAffected: deleted,
      meta: { deleted },
    });

    log.info({ deleted }, "cleanup expired sessions completed");
    return { deleted };
  } catch (err: unknown) {
    await finishJobRunFailed({
      id: jobRun.id,
      startedAtMs,
      err,
      rowsAffected: 0,
      meta: {},
    });
    throw err;
  }
}

