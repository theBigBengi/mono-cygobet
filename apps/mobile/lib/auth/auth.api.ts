// lib/auth/auth.api.ts
// Auth-domain API module.
// - Only this file talks directly to apiFetch/apiFetchWithAuthRetry.
// - Screens and hooks must depend on these functions instead of raw HTTP.
import { Platform } from "react-native";
import { apiFetch, apiFetchWithAuthRetry } from "../http/apiClient";
import type {
  UserLoginResponse,
  UserRegisterResponse,
  UserRefreshResponse,
  UserMeResponse,
  UserLogoutResponse,
  UserGoogleResponse,
} from "./auth.types";
import type { ApiUserProfileResponse } from "@repo/types";

/**
 * Login with email/username and password.
 * - Public endpoint: does NOT require an access token.
 * - Returns access + refresh tokens; AuthProvider decides how to store them.
 */
export async function login(
  emailOrUsername: string,
  password: string
): Promise<UserLoginResponse> {
  return apiFetch<UserLoginResponse>("/auth/login", {
    method: "POST",
    body: { emailOrUsername, password },
  });
}

/**
 * Register a new user.
 * - Public endpoint.
 * - Server may enforce additional validation (email uniqueness, etc.).
 * - Username is optional (can be set later during onboarding).
 */
export async function register(input: {
  email: string;
  username?: string | null;
  password: string;
  name?: string | null;
}): Promise<UserRegisterResponse> {
  return apiFetch<UserRegisterResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

/**
 * Refresh access token using refresh token (native) or HttpOnly cookie (web).
 * - Native: pass refreshToken, sent in body.
 * - Web: pass null/empty; server reads from cookie, body omitted.
 */
export async function refresh(
  refreshToken: string | null
): Promise<UserRefreshResponse> {
  const isWeb = Platform.OS === "web";
  const body = isWeb || !refreshToken ? {} : { refreshToken };
  return apiFetch<UserRefreshResponse>("/auth/refresh", {
    method: "POST",
    body,
  });
}

/**
 * Get current user info.
 * - Protected endpoint.
 * - Uses apiFetchWithAuthRetry so a stale access token is transparently refreshed.
 * - Access token is read via getAccessTokenCallback wired in AuthProvider.
 */
export async function me(): Promise<UserMeResponse> {
  return apiFetchWithAuthRetry<UserMeResponse>("/auth/me", {
    method: "GET",
  });
}

/**
 * Login with Google OAuth (idToken).
 * - Public endpoint.
 * - Mirrors email/password login flow but with Google identity.
 */
export async function google(idToken: string): Promise<UserGoogleResponse> {
  return apiFetch<UserGoogleResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });
}

/**
 * Logout (revoke refresh token).
 * - Best-effort: server may or may not see the request (network issues).
 * - Client still clears local tokens regardless of server result.
 */
export async function logout(
  refreshToken?: string
): Promise<UserLogoutResponse> {
  return apiFetch<UserLogoutResponse>("/auth/logout", {
    method: "POST",
    body: refreshToken ? { refreshToken } : {},
  });
}

/**
 * Check if a username is available.
 * - Protected endpoint (requires auth).
 * - Used during onboarding to validate username before submission.
 */
export async function checkUsernameAvailable(
  username: string
): Promise<{ available: boolean }> {
  return apiFetchWithAuthRetry<{ available: boolean }>(
    `/auth/username/check?username=${encodeURIComponent(username)}`,
    { method: "GET" }
  );
}

/**
 * Complete onboarding by setting username.
 * - Protected endpoint, onboarding-gated.
 * - After success, client should re-bootstrap auth state to get updated flags.
 */
export async function completeOnboarding(
  username: string
): Promise<{ success: boolean }> {
  return apiFetchWithAuthRetry<{ success: boolean }>(
    "/auth/onboarding/complete",
    {
      method: "POST",
      body: { username },
    }
  );
}

/**
 * Change password (email/password users only).
 * - Protected endpoint.
 * - Throws ApiError with server message on failure (e.g. wrong current password).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiFetchWithAuthRetry<void>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

/**
 * Get full user profile (user + profile domain data).
 * - Protected AND onboarding-gated.
 * - New features needing profile info should call this via the profile feature,
 *   not directly from screens.
 */
export async function getProfile() {
  return apiFetchWithAuthRetry<ApiUserProfileResponse>("/api/users/profile", {
    method: "GET",
  });
}
