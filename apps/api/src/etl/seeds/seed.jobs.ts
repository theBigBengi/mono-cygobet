// src/etl/seeds/seed.jobs.ts
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

/**
 * Job data structure for seeding
 */
interface JobData {
  key: string;
  description: string;
  scheduleCron?: string;
  enabled?: boolean;
}

const CHUNK_SIZE = 8;

/**
 * Seeds jobs into the database using Prisma upsert operations.
 */
export async function seedJobs(
  jobs: JobData[],
  opts?: {
    batchId?: number;
    version?: string;
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
    dryRun?: boolean;
  }
) {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${jobs?.length ?? 0} jobs would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: jobs?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-jobs",
      opts?.version ?? "v1",
      { totalInput: jobs?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!jobs?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  console.log(`🔧 Starting jobs seeding: ${jobs.length} jobs to process`);

  // De-dupe input
  const seen = new Set<string>();
  const uniqueJobs: typeof jobs = [];
  const duplicates: typeof jobs = [];

  for (const job of jobs) {
    const key = job.key;
    if (seen.has(key)) {
      duplicates.push(job);
    } else {
      seen.add(key);
      uniqueJobs.push(job);
    }
  }

  if (duplicates.length > 0) {
    console.log(
      `⚠️  Input contained ${duplicates.length} duplicate jobs, processing ${uniqueJobs.length} unique items`
    );
    const duplicatePromises = duplicates.map((job) =>
      trackSeedItem(
        batchId!,
        job.key,
        RunStatus.skipped,
        undefined,
        {
          name: job.key,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueJobs, CHUNK_SIZE)) {
      // Process all jobs in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (job) => {
          try {
            if (!job.key) {
              throw new Error("Job key is required");
            }

            await prisma.jobs.upsert({
              where: { key: job.key },
              update: {
                description: job.description ?? undefined,
                scheduleCron: job.scheduleCron ?? undefined,
                enabled: job.enabled ?? undefined,
                updatedAt: new Date(),
              },
              create: {
                key: job.key,
                description: job.description ?? null,
                scheduleCron: job.scheduleCron ?? null,
                enabled: job.enabled ?? true,
              },
            });

            await trackSeedItem(
              batchId!,
              job.key,
              RunStatus.success,
              undefined,
              {
                name: job.key,
                description: job.description,
              }
            );

            return { success: true, job };
          } catch (e: any) {
            const errorCode = e?.code || "UNKNOWN_ERROR";
            const errorMessage = e?.message || "Unknown error";

            await trackSeedItem(
              batchId!,
              job.key,
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: job.key,
                description: job.description,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
              }
            );

            console.log(
              `❌ [${batchId}] Job failed: ${job.key} - ${errorMessage}`
            );

            return { success: false, job, error: errorMessage };
          }
        })
      );

      // Count successes and failures from this chunk
      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            ok++;
          } else {
            fail++;
          }
        } else {
          fail++;
        }
      }
    }

    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail },
    });

    console.log(
      `🎉 [${batchId}] Jobs seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: any) {
    console.log(
      `💥 [${batchId}] Unexpected error during jobs seeding: ${
        e?.message || "Unknown error"
      }`
    );
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String(e?.message ?? e).slice(0, 500),
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}

/**
 * Seeds the default jobs that should always exist in the system.
 * These are fixed jobs, not fetched from external APIs.
 */
export async function seedDefaultJobs(opts?: { dryRun?: boolean }) {
  const defaultJobs: JobData[] = [
    {
      key: "session-cleanup",
      description: "Cleaning expired sessions",
      enabled: true,
    },
  ];

  console.log(
    `📋 Default jobs to seed: ${defaultJobs.map((j) => j.key).join(", ")}`
  );
  return await seedJobs(defaultJobs, opts);
}

