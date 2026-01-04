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
  meta: Record<string, unknown>;
}> {
  // Backward-compatible: `jobs.meta` may not exist until migrations/prisma generate are applied.
  // We try to read/write meta, and fall back cleanly if the field isn't available yet.
  let existing:
    | { key: string; enabled: boolean; scheduleCron: string | null; meta?: any }
    | null = null;
  try {
    existing = await prisma.jobs.findUnique({
      where: { key: job.key },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select: { key: true, enabled: true, scheduleCron: true, meta: true } as any,
    });
  } catch {
    existing = await prisma.jobs.findUnique({
      where: { key: job.key },
      select: { key: true, enabled: true, scheduleCron: true },
    });
  }

  if (existing) {
    return {
      key: existing.key,
      enabled: existing.enabled,
      scheduleCron: existing.scheduleCron ?? null,
      meta:
        typeof (existing as any).meta === "object" && (existing as any).meta
          ? ((existing as any).meta as Record<string, unknown>)
          : {},
    };
  }

  // Create (try with meta, then fallback without)
  try {
    const created: any = await prisma.jobs.create({
      data: {
        key: job.key,
        description: job.description,
        scheduleCron: job.scheduleCron,
        enabled: job.enabled,
        meta: job.meta ?? {},
      } as any,
      select: { key: true, enabled: true, scheduleCron: true, meta: true } as any,
    });
    return {
      key: created.key,
      enabled: created.enabled,
      scheduleCron: created.scheduleCron ?? null,
      meta:
        typeof created.meta === "object" && created.meta
          ? (created.meta as Record<string, unknown>)
          : {},
    };
  } catch {
    const created = await prisma.jobs.create({
      data: {
        key: job.key,
        description: job.description,
        scheduleCron: job.scheduleCron,
        enabled: job.enabled,
      },
      select: { key: true, enabled: true, scheduleCron: true },
    });
    return {
      key: created.key,
      enabled: created.enabled,
      scheduleCron: created.scheduleCron ?? null,
      meta: {},
    };
  }

  // (unreachable)
}


