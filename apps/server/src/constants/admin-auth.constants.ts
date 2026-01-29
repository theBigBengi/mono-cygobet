// src/constants/admin-auth.constants.ts
/**
 * Admin authentication constants (session cookie + DB session settings).
 *
 * Admin auth is DB-backed sessions + httpOnly cookie (NO JWT).
 */

export const ADMIN_SESSION_COOKIE_NAME = "admin_session" as const;
export const ADMIN_SESSION_COOKIE_PATH = "/" as const;

// 1 day
export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 1;
// export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 15; // 15 minutes (testing)
// export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const ADMIN_SESSION_TOKEN_BYTES = 32;

/**
 * Sliding renewal configuration:
 * - When an authenticated admin makes a request and the remaining lifetime
 *   is <= ADMIN_SESSION_RENEWAL_THRESHOLD_PCT (percent of TTL), the session
 *   will be renewed (expires extended) and the cookie updated.
 *
 * Value is an integer percentage (0-100). Default: 25.
 */
export const ADMIN_SESSION_RENEWAL_THRESHOLD_PCT = 25;

/**
 * Maximum concurrent sessions per admin user.
 * When exceeded, the oldest sessions will be evicted (deleted) atomically.
 * Default: 3.
 */
export const ADMIN_SESSION_MAX_CONCURRENT = 3;
