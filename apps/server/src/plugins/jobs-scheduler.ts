import fp from "fastify-plugin";
import cron, { type ScheduledTask } from "node-cron";
import { JobTriggerBy, prisma } from "@repo/db";
import { RUNNABLE_JOBS } from "../jobs/jobs.registry";
import { getLockKeyForJob } from "../jobs/job-lock-keys";
import {
  AdvisoryLockNotAcquiredError,
  AdvisoryLockTimeoutError,
  DEFAULT_LOCK_TIMEOUT_MS,
  withAdvisoryLock,
} from "../utils/advisory-lock";
import { getLogger } from "../logger";

const log = getLogger("JobsScheduler");

/**
 * Jobs scheduler (cron)
 * --------------------
 * This plugin runs small background jobs inside the API process.
 *
 * Notes:
 * - Jobs are scheduled **in-memory** using `node-cron`. Schedules are created on server startup.
 * - The cron expression is sourced from DB (`jobs.scheduleCron`) so the admin UI can change it.
 * - We keep a `tasks` registry so we can stop/reschedule without restarting the API.
 * - We use a per-process in-memory lock so the same job won't overlap itself in this process.
 * - We use a Postgres advisory lock (via withAdvisoryLock) so the same logical operation
 *   cannot run in parallel across instances (cron vs admin vs CLI); second attempt skips or fails.
 */

// Simple per-process locks so the same job doesn't overlap itself.
// This prevents "double runs" inside a single node process, but does NOT prevent cross-instance overlap.
const running: Record<string, boolean> = {};

type JobFn = () => Promise<void> | void;

/**
 * guard()
 * -------
 * Wraps a job function with a per-process mutex.
 *
 * Why:
 * - If a job takes longer than its schedule interval, `node-cron` will try to trigger again.
 * - Overlapping runs can cause extra load and race conditions.
 *
 * What this does:
 * - If a run is already in progress for this job key in THIS PROCESS, the next trigger returns early.
 *
 * What it does NOT do:
 * - It does not coordinate across multiple API instances. For multi-instance, disable scheduler
 *   on all but one instance or add a distributed lock.
 */
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
  /**
   * Instance identity is recorded into `job_runs.meta.instanceId` so you can detect
   * when multiple API instances are running the scheduler.
   */
  const instanceId = `${process.env.HOSTNAME ?? "unknown-host"}:${process.pid}`;

  /**
   * In-memory scheduled tasks registry (per-process only).
   * - Keyed by job key.
   * - Lets us stop/reschedule tasks when admin changes `scheduleCron`.
   */
  const tasks = new Map<string, ScheduledTask>();

  function stopTask(jobKey: string) {
    const t = tasks.get(jobKey);
    if (t) {
      try {
        t.stop();
      } finally {
        tasks.delete(jobKey);
      }
    }
  }

  async function computeCronExpr(jobKey: string): Promise<string | null> {
    const runnable = RUNNABLE_JOBS.find((j) => j.key === jobKey);
    if (!runnable) return null;

    // Prefer DB value (admin-controlled).
    // We assume jobs are seeded and always exist; missing row is a deployment/config error.
    const db = await prisma.jobs.findUnique({
      where: { key: jobKey },
      select: { scheduleCron: true },
    });

    if (!db) {
      throw new Error(
        `Missing jobs row for '${jobKey}'. Seed jobs defaults into DB before starting the scheduler.`
      );
    }

    return db.scheduleCron ?? null;
  }

  /**
   * scheduleTask()
   * --------------
   * The core “apply schedule” function.
   *
   * Input: jobKey
   * Steps:
   * - Load DB scheduleCron
   * - Stop any existing in-memory cron task for this job
   * - If scheduleCron is null => do not schedule
   * - Else schedule node-cron task that calls the job runner
   */
  async function scheduleTask(jobKey: string) {
    const runnable = RUNNABLE_JOBS.find((j) => j.key === jobKey);
    if (!runnable) return;

    const cronExpr = await computeCronExpr(jobKey);

    // Stop old task (if any) before creating a new one so DB edits take effect immediately.
    stopTask(jobKey);

    // Null cron means "not scheduled".
    if (!cronExpr) return;

    // Create the cron task. We wrap with `guard()` (in-process) and `withAdvisoryLock` (cross-instance).
    const task = cron.schedule(
      cronExpr,
      guard(jobKey, async () => {
        const lockKey = getLockKeyForJob(jobKey);
        try {
          await withAdvisoryLock(
            lockKey,
            () =>
              runnable.run(fastify, {
                triggeredBy: JobTriggerBy.cron_scheduler,
                meta: { instanceId },
              }),
            { timeoutMs: DEFAULT_LOCK_TIMEOUT_MS }
          );
        } catch (err) {
          if (err instanceof AdvisoryLockNotAcquiredError) {
            log.info(
              { jobKey, lockKey },
              "Job skipped: lock already held by another process"
            );
            return;
          }
          if (err instanceof AdvisoryLockTimeoutError) {
            log.warn(
              { jobKey, lockKey, timeoutMs: err.timeoutMs },
              "Job timed out (caller rejected; lock released after job finishes)"
            );
            return;
          }
          throw err;
        }
      })
    );
    tasks.set(jobKey, task);
  }

  /**
   * Reschedule all runnable jobs based on DB `scheduleCron` (or defaults).
   * Used on startup and can be used for bulk refreshes.
   */
  async function rescheduleAll() {
    await Promise.allSettled(RUNNABLE_JOBS.map((j) => scheduleTask(j.key)));
  }

  /**
   * Reschedule a single job (stop old task, start new one, or stop if cron becomes null).
   * Called by admin PATCH route after updating `jobs.scheduleCron`.
   */
  async function rescheduleJob(jobKey: string) {
    await scheduleTask(jobKey);
  }

  /**
   * Stop all tasks for this process (used on server shutdown).
   */
  function stopAll() {
    for (const key of tasks.keys()) stopTask(key);
  }

  // Expose scheduler controls to routes/services (e.g. jobs-config PATCH can call rescheduleJob()).
  fastify.decorate("jobsScheduler", { rescheduleAll, rescheduleJob, stopAll });

  /**
   * Start schedules when the server is ready.
   * We avoid running cron scheduling at module load time so Fastify autoload stays fast/deterministic.
   */
  fastify.addHook("onReady", async () => {
    // Allow disabling the scheduler for multi-instance deployments.
    // This avoids duplicate cron runs when you scale API instances > 1.
    const enabledEnv = process.env.JOBS_SCHEDULER_ENABLED;
    const schedulerEnabled =
      enabledEnv === undefined
        ? true
        : !["0", "false", "no", "off"].includes(enabledEnv.toLowerCase());

    if (!schedulerEnabled) {
      log.info(
        { instanceId },
        "Job scheduler disabled (JOBS_SCHEDULER_ENABLED=false)"
      );
      return;
    }

    // Schedule all runnable jobs now (DB overrides registry defaults).
    await rescheduleAll();

    // Stop them on server close.
    fastify.addHook("onClose", async () => stopAll());

    log.info({ instanceId }, "Job scheduler started");
  });
});
