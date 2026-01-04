import fp from "fastify-plugin";
import cron from "node-cron";
import { JobTriggerBy, prisma } from "@repo/db";
import { RUNNABLE_JOBS } from "../jobs/jobs.registry";
import { ensureJobRow } from "../jobs/jobs.db";
import { JOB_DEFINITIONS } from "../jobs/jobs.definitions";

/**
 * Jobs scheduler (cron)
 * --------------------
 * This plugin runs small background jobs inside the API process.
 *
 * Notes:
 * - We use an in-memory lock so a job won't overlap with itself if a run takes longer than its schedule.
 * - Each job is still controlled by the `jobs` DB table (`enabled` flag). The scheduler triggers,
 *   the job decides whether to skip.
 */

// simple in-memory locks so the same job doesn't overlap
const running: Record<string, boolean> = {};

type JobFn = () => Promise<void> | void;

function guard(key: string, fn: JobFn): JobFn {
  return async () => {
    if (running[key]) return;
    running[key] = true;
    try {
      await fn();
    } finally {
      running[key] = false;
    }
  };
}

export default fp(async (fastify) => {
  // start schedules when server is ready
  fastify.addHook("onReady", async () => {
    // Ensure job rows exist in DB so the admin UI can list them even before first run.
    // Create only (no updates): admin is allowed to edit description/enabled/scheduleCron.
    await Promise.allSettled(JOB_DEFINITIONS.map((j) => ensureJobRow(j)));

    // schedule definitions: prefer DB scheduleCron if present, otherwise fallback to registry default
    const dbJobs = await prisma.jobs.findMany({
      where: { key: { in: RUNNABLE_JOBS.map((j) => j.key) } },
      select: { key: true, scheduleCron: true, enabled: true },
    });
    const dbMap = new Map(dbJobs.map((j) => [j.key, j]));

    const tasks = RUNNABLE_JOBS.map((j) => {
      const db = dbMap.get(j.key);
      const cronExpr = db?.scheduleCron ?? j.scheduleCron;
      return cronExpr
        ? {
            key: j.key,
            cron: cronExpr,
            fn: guard(j.key, async () => {
              await j.run(fastify, {
                triggeredBy: JobTriggerBy.cron_scheduler,
              });
            }),
          }
        : null;
    }).filter(Boolean) as Array<{
      key: string;
      cron: string;
      fn: () => Promise<void>;
    }>;

    for (const t of tasks) {
      const task = cron.schedule(t.cron, t.fn);
      // stop them on server close
      fastify.addHook("onClose", async () => task.stop());
    }
    fastify.log.info("✅ Job scheduler started");
  });
});
