import { prisma } from "@repo/db";
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
}> {
  const existing = await prisma.jobs.findUnique({
    where: { key: job.key },
    select: { key: true, enabled: true, scheduleCron: true },
  });

  if (existing) return existing;

  const created = await prisma.jobs.create({
    data: {
      key: job.key,
      description: job.description,
      scheduleCron: job.scheduleCron,
      enabled: job.enabled,
    },
    select: { key: true, enabled: true, scheduleCron: true },
  });

  return created;
}


