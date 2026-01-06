// src/constants/admin-auth.constants.ts
/**
 * Admin authentication constants (session cookie + DB session settings).
 *
 * Admin auth is DB-backed sessions + httpOnly cookie (NO JWT).
 */

export const ADMIN_SESSION_COOKIE_NAME = "admin_session" as const;
export const ADMIN_SESSION_COOKIE_PATH = "/" as const;

export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 15;
// export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const ADMIN_SESSION_TOKEN_BYTES = 32;
