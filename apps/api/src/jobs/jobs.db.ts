import { Prisma, prisma } from "@repo/db";
import type { JobDefinition } from "./jobs.definitions";

/**
 * Create-only job bootstrap.
 * - If the job exists in DB: return it (no updates, no upsert).
 * - If it does not exist: create it using the provided defaults.
 *
 * IMPORTANT: We intentionally do not update existing rows because admin UI
 * is allowed to edit description/enabled/scheduleCron.
 */
export async function ensureJobRow(job: JobDefinition): Promise<{
  key: string;
  enabled: boolean;
  scheduleCron: string | null;
  meta: Record<string, unknown>;
}> {
  const selectJob = Prisma.validator<Prisma.jobsSelect>()({
    key: true,
    enabled: true,
    scheduleCron: true,
    meta: true,
  });

  const existing = await prisma.jobs.findUnique({
    where: { key: job.key },
    select: selectJob,
  });

  if (existing) {
    return {
      key: existing.key,
      enabled: existing.enabled,
      scheduleCron: existing.scheduleCron ?? null,
      meta:
        typeof existing.meta === "object" && existing.meta && !Array.isArray(existing.meta)
          ? (existing.meta as Record<string, unknown>)
          : {},
    };
  }

  const created = await prisma.jobs.create({
    data: {
      key: job.key,
      description: job.description,
      scheduleCron: job.scheduleCron,
      enabled: job.enabled,
      meta: (job.meta ?? {}) as Prisma.InputJsonValue,
    },
    select: selectJob,
  });

  return {
    key: created.key,
    enabled: created.enabled,
    scheduleCron: created.scheduleCron ?? null,
    meta:
      typeof created.meta === "object" && created.meta && !Array.isArray(created.meta)
        ? (created.meta as Record<string, unknown>)
        : {},
  };
}


