// src/constants/user-auth.constants.ts
/**
 * User authentication constants (JWT access tokens + refresh tokens).
 *
 * User auth uses JWT access tokens (short-lived) + refresh tokens (long-lived, stored as hash in DB).
 */

// Access token: JWT, short-lived (10-15 minutes)
export const USER_ACCESS_TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

// Refresh token: random bytes, long-lived (30 days)
export const USER_REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const USER_REFRESH_TOKEN_BYTES = 32; // 32 bytes = 64 hex chars

/**
 * HttpOnly cookie for refresh token (Expo Web only).
 * SameSite: lax (balance CSRF vs redirects). Path: /auth (auth-only).
 */
export const USER_REFRESH_COOKIE_NAME = "user_refresh_token" as const;
export const USER_REFRESH_COOKIE_PATH = "/auth" as const;
