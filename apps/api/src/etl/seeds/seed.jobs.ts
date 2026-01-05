// src/etl/seeds/seed.jobs.ts
import { Prisma, RunStatus, RunTrigger, prisma } from "@repo/db";
import { JOB_DEFINITIONS } from "../../jobs/jobs.definitions";
import { startSeedBatch, trackSeedItem, finishSeedBatch } from "./seed.utils";

/**
 * Seed jobs defaults into DB (create-only).
 *
 * WHY:
 * - We want to guarantee `jobs` rows always exist (no runtime "create if missing").
 * - Admin is allowed to edit description/enabled/scheduleCron/meta, so seeding must NOT overwrite.
 * - This makes the runtime code simpler: jobs can assume DB config exists and just read it.
 *
 * BEHAVIOR:
 * - If a job already exists: mark item as skipped (no updates)
 * - If missing: create using `JOB_DEFINITIONS` defaults
 *
 * HOW TO USE:
 * - Run locally: `pnpm -C apps/api tsx src/etl/seeds/seed.cli.ts --jobs`
 * - In production: run it once after migrations (or as part of a deploy step).
 */
export async function seedJobsDefaults(opts?: { dryRun?: boolean }) {
  // Dry-run mode is used to preview what would happen without touching the DB.
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${JOB_DEFINITIONS.length} jobs would be created if missing (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: JOB_DEFINITIONS.length };
  }

  // Seed batches provide observability in DB (what ran, when, what succeeded/failed).
  const started = await startSeedBatch(
    "seed-jobs-defaults",
    "v1",
    { totalInput: JOB_DEFINITIONS.length, dryRun: false },
    {
      trigger: RunTrigger.manual,
      triggeredBy: "cli",
      triggeredById: null,
    }
  );

  // Batch id groups all per-job seed items.
  const batchId = started.id;

  // Counters are persisted into the seed batch for later debugging.
  let ok = 0;
  let fail = 0;
  let skipped = 0;

  try {
    for (const job of JOB_DEFINITIONS) {
      // Create-only: if row exists, do nothing.
      const existing = await prisma.jobs.findUnique({
        where: { key: job.key },
        select: { key: true },
      });

      if (existing) {
        skipped++;
        await trackSeedItem(batchId, job.key, RunStatus.skipped, undefined, {
          name: job.key,
          reason: "already-exists",
        });
        continue;
      }

      // Create with defaults. We do NOT write updates here to avoid overwriting admin edits.
      await prisma.jobs.create({
        data: {
          key: job.key,
          description: job.description,
          enabled: job.enabled,
          scheduleCron: job.scheduleCron,
          // `meta` is JSON; we store job-specific defaults here (e.g. odds filters).
          meta: (job.meta ?? {}) as unknown as Prisma.InputJsonValue,
        },
        select: { key: true },
      });

      ok++;
      await trackSeedItem(batchId, job.key, RunStatus.success, undefined, {
        name: job.key,
        description: job.description,
      });
    }

    // Mark the batch as successful. Note: "skipped" counts as finished, not failure.
    await finishSeedBatch(batchId, RunStatus.success, {
      itemsTotal: ok + fail + skipped,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail, skipped },
    });

    console.log(
      `✅ [${batchId}] Jobs defaults seeded: created=${ok}, skipped=${skipped}, failed=${fail}`
    );
    return { batchId, ok, fail, total: ok + fail + skipped };
  } catch (e: unknown) {
    // Any unexpected error marks the seed batch failed so it's visible in DB.
    fail++;
    await finishSeedBatch(batchId, RunStatus.failed, {
      itemsTotal: ok + fail + skipped,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String((e as any)?.message ?? e).slice(0, 500),
      meta: { ok, fail, skipped },
    });
    throw e;
  }
}
