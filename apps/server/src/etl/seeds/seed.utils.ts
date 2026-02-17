// src/etl/seeds/seed.utils.ts
import type { Prisma } from "@repo/db";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { chunk, safeBigInt } from "../utils";

// Re-export for seeds that import from seed.utils
export { chunk, safeBigInt };

// Safely coerce unknown JSON to an object for merging
function toJsonObject(v: unknown): Prisma.InputJsonObject {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Prisma.InputJsonObject;
  }
  return {};
}

/**
 * Start a seed batch (manual or auto)
 */
export async function startSeedBatch(
  name: string,
  version?: string,
  meta?: Prisma.InputJsonObject,
  opts?: {
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
  }
) {
  return prisma.seedBatches.create({
    data: {
      name,
      version,
      status: RunStatus.running, // enum, not string
      meta: meta ?? {},
      trigger: opts?.trigger ?? RunTrigger.manual, // enum default
      triggeredBy: opts?.triggeredBy ?? undefined,
      triggeredById: opts?.triggeredById ?? undefined,
    },
    select: { id: true, startedAt: true }, // keep it light
  });
}

/**
 * Track a single item result (success/failed/skipped) within a batch
 */
export async function trackSeedItem(
  batchId: bigint | number,
  itemKey: string | null,
  status: Exclude<RunStatus, "running" | "queued">,
  errorMessage?: string | null,
  meta?: Prisma.InputJsonObject
) {
  await prisma.seedItems.create({
    data: {
      batchId: Number(batchId),
      itemKey: itemKey ?? undefined,
      status, // enum
      errorMessage: errorMessage ?? undefined,
      meta: meta ?? {},
    },
  });
}

/**
 * Finish a seed batch and compute duration on the app side (simple & safe)
 */
export async function finishSeedBatch(
  id: bigint | number,
  status: Exclude<RunStatus, "running" | "queued">,
  extra?: {
    itemsTotal?: number;
    itemsSuccess?: number;
    itemsFailed?: number;
    errorMessage?: string;
    errorStack?: string;
    meta?: Prisma.InputJsonObject;
  }
) {
  const batch = await prisma.seedBatches.findUnique({
    where: { id: Number(id) },
    select: { startedAt: true, meta: true },
  });

  const durationMs = batch?.startedAt
    ? Date.now() - batch.startedAt.getTime()
    : null;

  const mergedMeta: Prisma.InputJsonObject = {
    ...toJsonObject(batch?.meta),
    ...toJsonObject(extra?.meta),
  };

  await prisma.seedBatches.update({
    where: { id: Number(id) },
    data: {
      status, // enum
      finishedAt: new Date(),
      durationMs: durationMs ?? undefined,
      itemsTotal: extra?.itemsTotal ?? undefined,
      itemsSuccess: extra?.itemsSuccess ?? undefined,
      itemsFailed: extra?.itemsFailed ?? undefined,
      errorMessage: extra?.errorMessage ?? undefined,
      errorStack: extra?.errorStack ?? undefined,
      meta: mergedMeta,
    },
  });
}

/**
 * Shared utility functions for seeding operations.
 * chunk and safeBigInt are in etl/utils.ts and re-exported here.
 */

/**
 * Normalizes date strings to date-only format (YYYY-MM-DD) with validation
 * IMPORTANT: Use this ONLY for date partitions (e.g., season start/end), NOT for kickoff fields
 * For kickoff fields, use isoFromUnixSeconds() with the Unix timestamp
 * @param dateString - Date string to normalize
 * @returns Normalized date string in YYYY-MM-DD format if valid, throws error if invalid
 */
export function normalizeDate(dateString: string | null | undefined): string {
  if (!dateString) {
    throw new Error("Date string is required but was null or undefined");
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: "${dateString}"`);
    }
    const result = date.toISOString().split("T")[0]; // Return YYYY-MM-DD format
    if (!result) {
      throw new Error(`Failed to extract date from "${dateString}"`);
    }
    return result;
  } catch (error) {
    throw new Error(
      `Failed to normalize date "${dateString}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Normalizes date strings to date-only format (YYYY-MM-DD) for partitioning/filtering
 * IMPORTANT: Use this ONLY for date partitions (e.g., season start/end), NOT for kickoff fields
 * For kickoff fields, use isoFromUnixSeconds() with the Unix timestamp
 * @param dateString - Date string to normalize
 * @returns Normalized date string in YYYY-MM-DD format
 */
export function normalizeDateOnly(
  dateString: string | null | undefined
): string {
  if (!dateString) {
    throw new Error("Date string is required but was null or undefined");
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: "${dateString}"`);
    }
    const result = date.toISOString().split("T")[0]; // YYYY-MM-DD only
    if (!result) {
      throw new Error(`Failed to extract date from "${dateString}"`);
    }
    return result;
  } catch (error) {
    throw new Error(
      `Failed to normalize date "${dateString}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Normalizes date strings to full ISO datetime format for scheduling
 * @param dateString - Date string to normalize
 * @returns Normalized date string in full ISO format with time
 */
export function normalizeDateTime(
  dateString: string | null | undefined
): string {
  if (!dateString) {
    throw new Error("Date string is required but was null or undefined");
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: "${dateString}"`);
    }
    return date.toISOString(); // Full ISO string with time
  } catch (error) {
    throw new Error(
      `Failed to normalize date "${dateString}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Converts Unix seconds to full ISO string for kickoff fields
 * Use this when the API gives you unix seconds and you need a full ISO kickoff
 * @param unixSeconds - Unix timestamp in seconds
 * @returns Full ISO string in UTC
 */
export function isoFromUnixSeconds(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) {
    throw new Error("unixSeconds must be finite");
  }
  return new Date(unixSeconds * 1000).toISOString(); // always UTC
}

/**
 * Strict datetime normalization for provider strings like "YYYY-MM-DD HH:mm:ss"
 * Normalizes to ISO string in UTC (avoids ambiguous Date parsing)
 * @param s - Date string to normalize
 * @returns Normalized ISO string in UTC
 */
export function normalizeDateTimeStrict(s: string): string {
  if (!s) {
    throw new Error("Date string is required");
  }
  // Handle "YYYY-MM-DD HH:mm:ss" (no TZ) deterministically as UTC
  // If strings may already be ISO, this also works.
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid datetime: "${s}"`);
  }
  return d.toISOString();
}

/**
 * Safely converts a value to Int, preventing NaN → Int conversion errors
 * @param value - Value to convert to Int
 * @returns Int value or throws error if conversion fails
 */
export function safeInt(value: number | string): number {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(
        `Invalid Int conversion: cannot parse "${value}" as number`
      );
    }
    return parsed;
  }

  if (typeof value === "number") {
    if (isNaN(value)) {
      throw new Error(`Invalid Int conversion: NaN value provided`);
    }
    return value;
  }

  throw new Error(`Invalid Int conversion: unexpected type ${typeof value}`);
}

/**
 * Validates that a required field exists and is not empty
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The value if valid, throws error if invalid
 */
export function validateRequiredField<T>(
  value: T | null | undefined,
  fieldName: string
): T {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Required field '${fieldName}' is missing or empty`);
  }
  return value;
}

/**
 * Normalizes and validates ISO codes to prevent dirty data
 * @param v - ISO code value to normalize
 * @param len - Expected length (2 or 3)
 * @returns Normalized ISO code or null if invalid
 */
export function normIso(v?: string | null, len?: 2 | 3): string | null {
  if (!v) return null;
  const x = v.trim().toUpperCase();
  if (len && x.length !== len) throw new Error(`Invalid ISO${len}: "${v}"`);
  return x;
}

/**
 * Normalizes short codes to prevent dirty data
 * @param v - Short code value to normalize
 * @returns Normalized short code or null if invalid
 */
export function normShortCode(v?: string | null): string | null {
  if (!v) return null;
  const x = v.trim().toUpperCase();
  if (x.length === 0) return null;
  return x;
}

/**
 * Validates founded year to ensure it's reasonable
 * @param v - Founded year value to validate
 * @returns Validated founded year or null if invalid
 */
export function validateFounded(v?: number | null): number | null {
  if (!v || typeof v !== "number") return null;
  const currentYear = new Date().getFullYear();
  if (v < 1800 || v > currentYear) return null;
  return v;
}

/**
 * Creates a consistent error message format for seeding failures
 * @param itemName - Name/identifier of the item that failed
 * @param externalId - External ID of the item
 * @param error - Error object or message
 * @returns Formatted error message
 */
export function formatSeedError(
  itemName: string,
  externalId: string | number,
  error: any
): string {
  const errorMessage = error?.message || String(error);
  return `${itemName} (ID: ${externalId}) - ${errorMessage}`;
}

/**
 * Computes the diff between old and new values for tracking changes.
 * Only includes fields that actually changed.
 * @param oldValues - The existing record values (or null if inserting)
 * @param newValues - The new values being written
 * @param fieldsToTrack - Array of field names to compare
 * @returns Object with changed fields in format { field: "oldValue → newValue" }
 */
export function computeChanges(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown>,
  fieldsToTrack: string[]
): Record<string, string> | null {
  if (!oldValues) {
    // Insert case - no changes to track
    return null;
  }

  const changes: Record<string, string> = {};

  for (const field of fieldsToTrack) {
    const oldVal = oldValues[field];
    const newVal = newValues[field];

    // Skip if both are null/undefined
    if (oldVal == null && newVal == null) continue;

    // Compare values (handle dates, bigints, etc.)
    const oldStr = formatValue(oldVal);
    const newStr = formatValue(newVal);

    if (oldStr !== newStr) {
      changes[field] = `${oldStr} → ${newStr}`;
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Formats a value for display in change tracking
 */
function formatValue(val: unknown): string {
  if (val == null) return "—";
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "bigint") return String(val);
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
