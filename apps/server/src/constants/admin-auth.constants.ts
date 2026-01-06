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
