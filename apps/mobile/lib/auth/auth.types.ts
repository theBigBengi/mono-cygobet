// lib/auth/auth.types.ts
import type {
  UserRefreshResponse,
  UserMeResponse,
  UserLogoutResponse,
} from "@repo/types/http/auth";

/**
 * Single auth success response type for login/register/google
 * All three endpoints return the same structure
 * This matches the server response perfectly and avoids type drift
 * Note: image is always present (can be null), not optional
 */
export type AuthSuccessResponse = {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

/**
 * API response types (aliased to AuthSuccessResponse for consistency)
 */
export type UserLoginResponse = AuthSuccessResponse;
export type UserRegisterResponse = AuthSuccessResponse;
export type UserGoogleResponse = AuthSuccessResponse;

// Re-export other API response types from shared package
export type { UserRefreshResponse, UserMeResponse, UserLogoutResponse };

/**
 * Domain User type (app state)
 * Maps from UserMeResponse but represents app domain model
 */
export type User = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  image: string | null;
  role: string;
  onboardingRequired: boolean;
  hasPassword: boolean;
};

export type AuthStatus =
  | "idle"
  | "restoring"
  | "authenticated"
  | "onboarding"
  | "unauthenticated"
  | "degraded";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  error: string | null;
}
