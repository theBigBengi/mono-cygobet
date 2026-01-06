// src/constants/admin-auth.constants.ts
/**
 * Admin authentication constants (session cookie + DB session settings).
 *
 * Admin auth is DB-backed sessions + httpOnly cookie (NO JWT).
 */

export const ADMIN_SESSION_COOKIE_NAME = "admin_session" as const;
export const ADMIN_SESSION_COOKIE_PATH = "/" as const;

// 15 minutes (can be adjusted later without changing the DB schema)
export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 15;

// Raw token length (stored in cookie); we store only a hash in the DB.
export const ADMIN_SESSION_TOKEN_BYTES = 32;
