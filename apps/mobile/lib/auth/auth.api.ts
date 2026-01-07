// lib/auth/auth.api.ts
import { apiFetch, apiFetchWithAuthRetry } from "../http/apiClient";
import type {
  UserLoginResponse,
  UserRegisterResponse,
  UserRefreshResponse,
  UserMeResponse,
  UserLogoutResponse,
  UserGoogleResponse,
} from "./auth.types";

/**
 * Login with email/username and password
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
 * Register a new user
 */
export async function register(input: {
  email: string;
  username: string;
  password: string;
  name?: string | null;
}): Promise<UserRegisterResponse> {
  return apiFetch<UserRegisterResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(
  refreshToken: string
): Promise<UserRefreshResponse> {
  return apiFetch<UserRefreshResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * Get current user info (uses auth retry for automatic token refresh)
 * Token is automatically retrieved via getAccessTokenCallback
 */
export async function me(): Promise<UserMeResponse> {
  return apiFetchWithAuthRetry<UserMeResponse>("/auth/me", {
    method: "GET",
  });
}

/**
 * Login with Google OAuth (idToken)
 */
export async function google(idToken: string): Promise<UserGoogleResponse> {
  return apiFetch<UserGoogleResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });
}

/**
 * Logout (revoke refresh token)
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
 * Complete onboarding by setting username
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
 * Get full user profile (user + profile domain data)
 */
export async function getProfile() {
  return apiFetchWithAuthRetry<import("@repo/types").ApiUserProfileResponse>(
    "/api/users/profile",
    {
      method: "GET",
    }
  );
}
