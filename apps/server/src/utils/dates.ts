const INT32_MAX = 2_147_483_647;
const INT32_MIN = -2_147_483_648;

/**
 * parseOptionalDate()
 * ------------------
 * Accepts:
 * - ISO datetime string (e.g. "2026-01-06T00:00:00Z")
 * - unix seconds/millis (number)
 * - unix seconds/millis (numeric string)
 *
 * Returns null when input is missing/invalid.
 */
export function parseOptionalDate(value: unknown): Date | null {
  if (value == null) return null;

  // unix seconds/millis (number)
  if (typeof value === "number" && Number.isFinite(value)) {
    // Heuristic: <= int32 range => seconds, else millis
    const ms = value <= INT32_MAX && value >= INT32_MIN ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  // numeric string -> unix seconds/millis
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = n <= INT32_MAX && n >= INT32_MIN ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

export function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/**
 * Get current Unix timestamp in seconds.
 * Equivalent to toUnixSeconds(new Date()).
 */
export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get start and end of today in UTC (Unix seconds).
 * Useful for "today's games" filters.
 */
export function getTodayUtcBounds(nowSeconds: number): {
  startTs: number;
  endTs: number;
} {
  const d = new Date(nowSeconds * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const startTs = Math.floor(
    Date.UTC(y, m, day, 0, 0, 0, 0) / 1000
  );
  const endTs = Math.floor(
    Date.UTC(y, m, day, 23, 59, 59, 999) / 1000
  ) + 1; // exclusive end: start of next day
  return { startTs, endTs };
}
