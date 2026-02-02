import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { Prisma, prisma } from "@repo/db";
import type {
  AdminJobDetailResponse,
  AdminJobsListResponse,
  AdminUpdateJobResponse,
} from "@repo/types";

import { BadRequestError, NotFoundError } from "../../utils/errors";
import { getLogger } from "../../logger";

const log = getLogger("JobsConfig");
import { isJobRunnable } from "../../jobs/jobs.registry";
import { isUpdatePrematchOddsJobMeta } from "../../jobs/jobs.meta";
import { isFinishedFixturesJobMeta } from "../../jobs/jobs.meta";

/**
 * Canonical job key for job-specific meta validation.
 *
 * NOTE: We intentionally keep job keys as strings (not enums) to keep Prisma/job definitions simple.
 */
const UPDATE_PREMATCH_ODDS_JOB_KEY = "update-prematch-odds" as const;
const FINISHED_FIXTURES_JOB_KEY = "finished-fixtures" as const;

type JobRow = AdminJobsListResponse["data"][number];
type UpdateJobRow = AdminUpdateJobResponse["data"];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * `jobs.meta` is a JSON column.
 * We return `{}` if it's null/invalid so the admin UI always receives an object.
 */
function normalizeMeta(v: unknown): Record<string, unknown> {
  return isPlainObject(v) ? v : {};
}

/**
 * Shallow-merge top-level keys of existing meta with incoming patch.
 * For nested objects (e.g. `odds`), the incoming value replaces the existing one.
 * This prevents losing sibling keys when the frontend only sends a subset.
 */
function mergeMeta(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  return { ...existing, ...incoming };
}

/**
 * Minimal type guard for Prisma errors.
 * Prisma uses `unknown` errors in TS; we only care about the `code` field for P2025.
 */
function isObjectWithCode(v: unknown): v is { code: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "code" in v &&
    typeof (v as { code: unknown }).code === "string"
  );
}

/**
 * Shared Prisma selection for jobs list + job update return value.
 *
 * Why this exists:
 * - Keeps list/update in sync (same fields, same nested last run selection)
 * - Eliminates `any` / ad-hoc casting by using `Prisma.validator` + `jobsGetPayload`
 */
const selectJobWithLastRun = Prisma.validator<Prisma.jobsSelect>()({
  key: true,
  description: true,
  scheduleCron: true,
  enabled: true,
  meta: true,
  createdAt: true,
  updatedAt: true,
  runs: {
    take: 10,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      trigger: true,
      triggeredBy: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
      rowsAffected: true,
      errorMessage: true,
      meta: true,
    },
  },
});

const selectJobWithLast10Runs = Prisma.validator<Prisma.jobsSelect>()({
  key: true,
  description: true,
  scheduleCron: true,
  enabled: true,
  meta: true,
  createdAt: true,
  updatedAt: true,
  runs: {
    take: 10,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      trigger: true,
      triggeredBy: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
      rowsAffected: true,
      errorMessage: true,
      meta: true,
    },
  },
});

type JobWithLast10Runs = Prisma.jobsGetPayload<{
  select: typeof selectJobWithLast10Runs;
}>;

type JobWithLastRun = Prisma.jobsGetPayload<{
  select: typeof selectJobWithLastRun;
}>;

/**
 * AdminJobsConfigService
 * ---------------------
 * Business logic behind:
 * - GET   /admin/db/jobs
 * - PATCH /admin/db/jobs/:jobId
 *
 * Routes should be thin (HTTP + error mapping). Validation + DB access stays here.
 */
export class AdminJobsConfigService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get a single job by key with last 10 runs (for job detail page).
   * Throws NotFoundError if job does not exist.
   */
  async getJob(jobKey: string): Promise<AdminJobDetailResponse["data"]> {
    const job: JobWithLast10Runs | null = await prisma.jobs.findUnique({
      where: { key: jobKey },
      select: selectJobWithLast10Runs,
    });
    if (!job) throw new NotFoundError(`Job '${jobKey}' not found`);
    return {
      key: job.key,
      description: job.description ?? null,
      scheduleCron: job.scheduleCron ?? null,
      enabled: job.enabled,
      meta: normalizeMeta(job.meta),
      runnable: isJobRunnable(job.key),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      lastRuns: (job.runs ?? []).map((r) => ({
        id: r.id,
        status: String(r.status),
        trigger: String(r.trigger),
        triggeredBy: r.triggeredBy ? String(r.triggeredBy) : null,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt?.toISOString() ?? null,
        durationMs: r.durationMs ?? null,
        rowsAffected: r.rowsAffected ?? null,
        errorMessage: r.errorMessage ?? null,
        meta: (r.meta ?? {}) as Record<string, unknown>,
      })),
    };
  }

  /**
   * List jobs from DB including:
   * - last run (latest)
   * - derived runnable flag (from job registry)
   */
  async listJobs(): Promise<JobRow[]> {
    const jobs: JobWithLastRun[] = await prisma.jobs.findMany({
      orderBy: { key: "asc" },
      select: selectJobWithLastRun,
    });

    return jobs.map((j) => {
      const runs = j.runs ?? [];
      const lastRun = runs[0];
      return {
        key: j.key,
        description: j.description ?? null,
        scheduleCron: j.scheduleCron ?? null,
        enabled: j.enabled,
        meta: normalizeMeta(j.meta),
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        runnable: isJobRunnable(j.key),
        lastRun: lastRun
          ? {
              id: lastRun.id,
              status: String(lastRun.status),
              trigger: String(lastRun.trigger),
              triggeredBy: lastRun.triggeredBy
                ? String(lastRun.triggeredBy)
                : null,
              startedAt: lastRun.startedAt.toISOString(),
              finishedAt: lastRun.finishedAt?.toISOString() ?? null,
              durationMs: lastRun.durationMs ?? null,
              rowsAffected: lastRun.rowsAffected ?? null,
              errorMessage: lastRun.errorMessage ?? null,
              meta: (lastRun.meta ?? {}) as Record<string, unknown>,
            }
          : null,
        lastRuns: runs.slice(0, 10).map((r) => ({
          id: r.id,
          status: String(r.status),
          startedAt: r.startedAt.toISOString(),
          durationMs: r.durationMs ?? null,
          rowsAffected: r.rowsAffected ?? null,
          meta: (r.meta ?? {}) as Record<string, unknown>,
        })),
      } satisfies JobRow;
    });
  }

  /**
   * Update job config.
   *
   * Responsibilities:
   * - Validate inputs (cron syntax; job-specific meta schema)
   * - Persist updates
   * - If schedule changes: reschedule in-memory cron task (per-process)
   */
  async updateJob(args: {
    jobId: string;
    patch: {
      description?: string | null;
      enabled?: boolean;
      scheduleCron?: string | null;
      meta?: Record<string, unknown> | null;
    };
  }): Promise<UpdateJobRow> {
    const { jobId, patch } = args;

    // Basic meta validation: must be an object when provided.
    if (
      patch.meta !== undefined &&
      patch.meta !== null &&
      !isPlainObject(patch.meta)
    ) {
      throw new BadRequestError("Invalid meta: expected a JSON object");
    }

    // Canonical meta schema validation (runtime), lives in API.
    if (patch.meta !== undefined && jobId === UPDATE_PREMATCH_ODDS_JOB_KEY) {
      if (patch.meta === null) {
        throw new BadRequestError(
          "Invalid meta for update-prematch-odds: expected a JSON object (not null)"
        );
      }
      if (!isUpdatePrematchOddsJobMeta(patch.meta)) {
        throw new BadRequestError(
          "Invalid meta for update-prematch-odds: expected { odds: { bookmakerExternalIds: number[], marketExternalIds: number[] } }"
        );
      }
      if (
        patch.meta.odds.bookmakerExternalIds.length < 1 ||
        patch.meta.odds.marketExternalIds.length < 1
      ) {
        throw new BadRequestError(
          "Invalid meta for update-prematch-odds: bookmakerExternalIds and marketExternalIds must be non-empty arrays"
        );
      }
      if (
        patch.meta.daysAhead !== undefined &&
        (!Number.isFinite(patch.meta.daysAhead) || patch.meta.daysAhead < 1)
      ) {
        throw new BadRequestError(
          "Invalid meta for update-prematch-odds: daysAhead must be a positive number"
        );
      }
    }

    if (patch.meta !== undefined && jobId === FINISHED_FIXTURES_JOB_KEY) {
      if (patch.meta === null) {
        throw new BadRequestError(
          "Invalid meta for finished-fixtures: expected a JSON object (not null)"
        );
      }

      // Allow empty meta (backward compatible), but if user provides the key we validate it.
      const m = patch.meta as Record<string, unknown>;
      if (m["maxLiveAgeHours"] !== undefined && !isFinishedFixturesJobMeta(m)) {
        throw new BadRequestError(
          "Invalid meta for finished-fixtures: expected { maxLiveAgeHours: number }"
        );
      }
      if (
        typeof m["maxLiveAgeHours"] === "number" &&
        (m["maxLiveAgeHours"] < 0.25 || m["maxLiveAgeHours"] > 168)
      ) {
        throw new BadRequestError(
          "Invalid meta for finished-fixtures: maxLiveAgeHours must be between 0.25 and 168"
        );
      }
    }

    // Normalize empty string cron to null.
    const scheduleCronRaw =
      typeof patch.scheduleCron === "string"
        ? patch.scheduleCron.trim()
        : patch.scheduleCron;
    const scheduleCron =
      scheduleCronRaw === ""
        ? null
        : (scheduleCronRaw as string | null | undefined);

    // Validate cron syntax early to avoid persisting invalid schedules.
    if (typeof scheduleCron === "string" && !cron.validate(scheduleCron)) {
      throw new BadRequestError(`Invalid cron expression: '${scheduleCron}'`);
    }

    let mergedMeta: Record<string, unknown> | undefined;
    if (patch.meta !== undefined && patch.meta !== null) {
      const current = await prisma.jobs.findUnique({
        where: { key: jobId },
        select: { meta: true },
      });
      if (!current) throw new NotFoundError(`Job '${jobId}' not found`);
      mergedMeta = mergeMeta(normalizeMeta(current.meta), patch.meta);
    }

    let updated: JobWithLastRun;
    try {
      updated = await prisma.jobs.update({
        where: { key: jobId },
        data: {
          ...(patch.description !== undefined
            ? { description: patch.description }
            : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
          ...(patch.scheduleCron !== undefined ? { scheduleCron } : {}),
          ...(patch.meta !== undefined
            ? {
                meta: (patch.meta === null
                  ? {}
                  : mergedMeta ?? patch.meta) as unknown as Prisma.InputJsonValue,
              }
            : {}),
        },
        select: selectJobWithLastRun,
      });
    } catch (e: unknown) {
      // Not found (Prisma P2025)
      if (isObjectWithCode(e) && e.code === "P2025") {
        throw new NotFoundError(`Job '${jobId}' not found`);
      }
      throw e;
    }

    // Apply schedule changes immediately (per-process). Without this, cron changes
    // only take effect after an API restart.
    if (patch.scheduleCron !== undefined) {
      try {
        await this.fastify.jobsScheduler?.rescheduleJob(updated.key);
      } catch (e) {
        log.warn(
          { err: e, jobKey: updated.key },
          "Failed to reschedule job after update"
        );
      }
    }

    const lastRun = updated.runs?.[0];

    return {
      key: updated.key,
      description: updated.description ?? null,
      scheduleCron: updated.scheduleCron ?? null,
      enabled: updated.enabled,
      meta: normalizeMeta(updated.meta),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      runnable: isJobRunnable(updated.key),
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: String(lastRun.status),
            trigger: String(lastRun.trigger),
            triggeredBy: lastRun.triggeredBy
              ? String(lastRun.triggeredBy)
              : null,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() ?? null,
            durationMs: lastRun.durationMs ?? null,
            rowsAffected: lastRun.rowsAffected ?? null,
            errorMessage: lastRun.errorMessage ?? null,
          }
        : null,
    } satisfies UpdateJobRow;
  }
}
