import { JobTriggerBy, Prisma, RunStatus, RunTrigger, prisma } from "@repo/db";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Get environment tag for job run metadata.
 *
 * This is used ONLY for tracking/debugging purposes in job run metadata.
 * It does NOT control whether jobs run or not.
 *
 * Detection logic:
 * - Primary: Checks NODE_ENV === "production"
 * - Fallback: If NODE_ENV is not set, checks for production indicators:
 *   - RENDER=true (Render.com production environment)
 *   - VERCEL=true (Vercel production environment)
 *
 * Note: Most deployment platforms automatically set NODE_ENV=production.
 * If your platform doesn't, you can either:
 * 1. Set NODE_ENV=production explicitly in your environment variables
 * 2. Rely on the fallback detection (if supported)
 *
 * @returns "PRODUCTION" if production environment detected, otherwise "DEVELOPMENT"
 */
function getEnvironmentTag(): "PRODUCTION" | "DEVELOPMENT" {
  // Primary check: NODE_ENV
  if (process.env.NODE_ENV === "production") {
    return "PRODUCTION";
  }

  // Fallback: Check for production platform indicators
  // Render.com sets RENDER=true in production
  if (process.env.RENDER === "true") {
    return "PRODUCTION";
  }

  // Vercel sets VERCEL=true in production
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return "PRODUCTION";
  }

  // Default to DEVELOPMENT
  return "DEVELOPMENT";
}

function toJsonObject(v: unknown): Prisma.InputJsonObject {
  return isPlainObject(v) ? (v as Prisma.InputJsonObject) : {};
}

function coerceMeta(
  meta?: Record<string, unknown> | null
): Prisma.InputJsonObject {
  const base = toJsonObject(meta ?? {});
  // Always record which environment produced the run for debugging/ops.
  // We intentionally overwrite any incoming value because the process environment is the source of truth.
  return { ...base, environment: getEnvironmentTag() };
}

function normalizeError(err: unknown): { message: string; stack: string } {
  const e = err as { message?: unknown; stack?: unknown };
  const message = String(e?.message ?? err ?? "Unknown error").slice(0, 1000);
  const stack = String(e?.stack ?? "").slice(0, 2000);
  return { message, stack };
}

/**
 * Jobs DB helpers
 * --------------
 * Purpose (in plain words):
 * - All job runners need to read their configuration from DB (`jobs` table).
 * - We *guarantee* jobs exist in DB by running a seed (create-only).
 * - Therefore: if a row is missing, something is wrong and we crash loudly.
 *
 * Why this file exists:
 * - Keeps Prisma access in one place so all jobs fetch config consistently.
 * - Keeps the “fail fast if missing” rule consistent everywhere.
 *
 * IMPORTANT:
 * - We assume jobs are seeded into DB (see `etl/seeds/seed.jobs.ts`).
 * - No implicit creation here (no upsert / no "create if missing").
 * - If a job row is missing, we throw so the system fails loudly and you seed properly.
 */
export async function getJobRowOrThrow(jobKey: string): Promise<{
  key: string;
  enabled: boolean;
  scheduleCron: string | null;
  meta: Record<string, unknown>;
}> {
  /**
   * `selectJob` is defined with `Prisma.validator` so:
   * - The selection shape is type-checked by TypeScript.
   * - Call sites get strongly-typed results without `any`.
   */
  const selectJob = Prisma.validator<Prisma.jobsSelect>()({
    key: true,
    enabled: true,
    scheduleCron: true,
    meta: true,
  });

  // Primary key lookup by job key.
  const row = await prisma.jobs.findUnique({
    where: { key: jobKey },
    select: selectJob,
  });

  if (!row) {
    // We intentionally throw here because job rows are “infrastructure config”.
    // If a row is missing, the fix is: run the jobs defaults seed, not to create it at runtime.
    throw new Error(
      `Missing jobs row for '${jobKey}'. Seed jobs defaults into DB before running the API.`
    );
  }

  // Normalize meta to a plain object for the rest of the codebase.
  return {
    key: row.key,
    enabled: row.enabled,
    scheduleCron: row.scheduleCron ?? null,
    meta:
      typeof row.meta === "object" && row.meta && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {},
  };
}

export type StartedJobRun = { id: number; startedAtMs: number };

export async function startJobRun(args: {
  jobKey: string;
  trigger: RunTrigger;
  triggeredBy: JobTriggerBy | null;
  triggeredById: string | null;
  meta?: Record<string, unknown>;
}): Promise<StartedJobRun> {
  const startedAtMs = Date.now();
  const run = await prisma.jobRuns.create({
    data: {
      jobKey: args.jobKey,
      status: RunStatus.running,
      trigger: args.trigger,
      triggeredBy: args.triggeredBy ?? null,
      triggeredById: args.triggeredById ?? null,
      meta: coerceMeta(args.meta),
    },
    select: { id: true },
  });
  return { id: run.id, startedAtMs };
}

async function finishJobRun(args: {
  id: number;
  startedAtMs: number;
  status: Exclude<RunStatus, "running" | "queued">;
  rowsAffected?: number;
  meta?: Record<string, unknown>;
  errorMessage?: string | null;
  errorStack?: string | null;
}) {
  await prisma.jobRuns.update({
    where: { id: args.id },
    data: {
      status: args.status,
      finishedAt: new Date(),
      durationMs: Date.now() - args.startedAtMs,
      rowsAffected: args.rowsAffected ?? 0,
      errorMessage: args.errorMessage ?? undefined,
      errorStack: args.errorStack ?? undefined,
      meta: coerceMeta(args.meta),
    },
  });
}

export async function finishJobRunSuccess(args: {
  id: number;
  startedAtMs: number;
  rowsAffected?: number;
  meta?: Record<string, unknown>;
}) {
  return finishJobRun({
    id: args.id,
    startedAtMs: args.startedAtMs,
    status: RunStatus.success,
    rowsAffected: args.rowsAffected,
    meta: args.meta,
  });
}

export async function finishJobRunSkipped(args: {
  id: number;
  startedAtMs: number;
  rowsAffected?: number;
  meta?: Record<string, unknown>;
}) {
  return finishJobRun({
    id: args.id,
    startedAtMs: args.startedAtMs,
    status: RunStatus.skipped,
    rowsAffected: args.rowsAffected,
    meta: args.meta,
  });
}

export async function finishJobRunFailed(args: {
  id: number;
  startedAtMs: number;
  err: unknown;
  rowsAffected?: number;
  meta?: Record<string, unknown>;
}) {
  const { message, stack } = normalizeError(args.err);
  return finishJobRun({
    id: args.id,
    startedAtMs: args.startedAtMs,
    status: RunStatus.failed,
    rowsAffected: args.rowsAffected ?? 0,
    errorMessage: message,
    errorStack: stack,
    meta: args.meta,
  });
}

/**
 * Mark orphaned job runs (stuck in "running" for too long) as failed.
 * Called periodically to prevent stale records from blocking admin UI signals.
 */
export async function markOrphanedJobRuns(maxAgeMs: number = 3 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await prisma.jobRuns.updateMany({
    where: {
      status: RunStatus.running,
      startedAt: { lt: cutoff },
    },
    data: {
      status: RunStatus.failed,
      finishedAt: new Date(),
      errorMessage: "Marked as failed by orphan detection (exceeded max age)",
    },
  });
  return result.count;
}
