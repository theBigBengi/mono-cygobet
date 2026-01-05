import { Prisma, prisma } from "@repo/db";

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
