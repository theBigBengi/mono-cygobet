import type {
  UpdatePrematchOddsJobMeta,
  UpcomingFixturesJobMeta,
  FinishedFixturesJobMeta,
  RecoveryOverdueFixturesJobMeta,
} from "@repo/types";

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
 * Generic meta extraction (type-level only)
 * ----------------------------------------
 * Intentionally generic: does not know job keys or fields.
 *
 * NOTE:
 * - This is a *type cast* helper. It does not validate runtime shape.
 * - Runtime validation should be done elsewhere (e.g. admin PATCH validation) or via the
 *   job-specific `isXxxJobMeta` guards below when needed.
 */
export function getMeta<T>(meta: Record<string, unknown>): T {
  if (!isPlainObject(meta)) throw new Error("Invalid meta: expected object");
  return meta as unknown as T;
}

export function clampInt(n: number, min: number, max: number): number {
  const x = Math.trunc(n);
  return Math.max(min, Math.min(max, x));
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

export function isUpcomingFixturesJobMeta(
  v: unknown
): v is UpcomingFixturesJobMeta {
  if (!isPlainObject(v)) return false;
  return typeof v["daysAhead"] === "number" && Number.isFinite(v["daysAhead"]);
}

export function isFinishedFixturesJobMeta(
  v: unknown
): v is FinishedFixturesJobMeta {
  if (!isPlainObject(v)) return false;
  return (
    typeof v["maxLiveAgeHours"] === "number" &&
    Number.isFinite(v["maxLiveAgeHours"])
  );
}

export function isRecoveryOverdueFixturesJobMeta(
  v: unknown
): v is RecoveryOverdueFixturesJobMeta {
  if (!isPlainObject(v)) return false;
  const { graceMinutes, maxOverdueHours } = v;
  if (graceMinutes !== undefined && typeof graceMinutes !== "number")
    return false;
  if (maxOverdueHours !== undefined && typeof maxOverdueHours !== "number")
    return false;
  return true;
}
