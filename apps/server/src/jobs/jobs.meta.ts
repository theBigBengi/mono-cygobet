import type { UpdatePrematchOddsJobMeta } from "@repo/types";

/**
 * Runtime validators for `jobs.meta`.
 *
 * IMPORTANT:
 * - `@repo/types` must contain *types only* (no runtime code).
 * - Runtime validation belongs in the API (this file), because it protects DB writes and job execution.
 *
 * What is `jobs.meta`?
 * - A JSON column in the `jobs` table.
 * - Used to store job-specific configuration (e.g. which markets/bookmakers to fetch).
 *
 * Why validators exist:
 * - `meta` is JSON => it is `unknown` at runtime.
 * - We validate to avoid silent misconfiguration and weird job behavior.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNumberArray(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.every((x) => typeof x === "number" && Number.isFinite(x))
  );
}

/**
 * Validate canonical meta schema for `update-prematch-odds`.
 *
 * Expected shape:
 * {
 *   odds: {
 *     bookmakerExternalIds: number[],
 *     marketExternalIds: number[]
 *   }
 * }
 *
 * This is used in:
 * - Admin PATCH route validation (reject invalid payloads)
 * - Job runner validation (fail fast if DB is corrupted/missing data)
 */
export function isUpdatePrematchOddsJobMeta(
  v: unknown
): v is UpdatePrematchOddsJobMeta {
  if (!isPlainObject(v)) return false;
  const odds = v["odds"];
  if (!isPlainObject(odds)) return false;
  return (
    isNumberArray(odds["bookmakerExternalIds"]) &&
    isNumberArray(odds["marketExternalIds"])
  );
}
