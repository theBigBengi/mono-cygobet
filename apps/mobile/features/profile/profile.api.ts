// Profile feature API module.
// - Encapsulates the raw HTTP call for fetching the current user's profile.
// - React Query hooks should depend on this function, not on apiClient directly.
import type {
  ApiUserProfileResponse,
  ApiUserStatsResponse,
  ApiHeadToHeadResponse,
  ApiH2HOpponentsResponse,
  ApiGamificationResponse,
} from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

export interface UpdateProfileInput {
  username?: string;
  name?: string;
  image?: string | null;
}

/**
 * Update the current user's profile (username, name, image).
 * - Protected + onboarding-gated endpoint.
 * - Returns the updated profile shape.
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<ApiUserProfileResponse> {
  return apiFetchWithAuthRetry<ApiUserProfileResponse>("/api/users/profile", {
    method: "PATCH",
    body: input,
  });
}

/**
 * Fetch the current user's profile (user + profile) from the server.
 * - Protected + onboarding-gated endpoint.
 * - Returns the raw transport shape defined in @repo/types.
 */
export async function fetchProfile(): Promise<ApiUserProfileResponse> {
  return apiFetchWithAuthRetry<ApiUserProfileResponse>("/api/users/profile", {
    method: "GET",
  });
}

/**
 * Fetch user stats (overall, badges, form, per-group breakdown) from the server.
 * - Protected + onboarding-gated endpoint.
 */
export async function fetchUserStats(
  userId: number
): Promise<ApiUserStatsResponse> {
  return apiFetchWithAuthRetry<ApiUserStatsResponse>(
    `/api/users/${userId}/stats`,
    { method: "GET" }
  );
}

/**
 * Fetch head-to-head comparison between two users from the server.
 * - Protected + onboarding-gated endpoint.
 */
export async function fetchHeadToHead(
  userId: number,
  opponentId: number
): Promise<ApiHeadToHeadResponse> {
  return apiFetchWithAuthRetry<ApiHeadToHeadResponse>(
    `/api/users/${userId}/head-to-head/${opponentId}`,
    { method: "GET" }
  );
}

/**
 * Fetch list of potential H2H opponents (users in shared groups).
 */
export async function fetchH2HOpponents(
  userId: number
): Promise<ApiH2HOpponentsResponse> {
  return apiFetchWithAuthRetry<ApiH2HOpponentsResponse>(
    `/api/users/${userId}/h2h-opponents`,
    { method: "GET" }
  );
}

/**
 * Fetch gamification data (power score, rank tier, skills, streak, season comparison).
 * - Protected + onboarding-gated endpoint.
 */
export async function fetchGamification(
  userId: number
): Promise<ApiGamificationResponse> {
  return apiFetchWithAuthRetry<ApiGamificationResponse>(
    `/api/users/${userId}/gamification`,
    { method: "GET" }
  );
}
