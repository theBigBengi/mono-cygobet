// Profile feature API module.
// - Encapsulates the raw HTTP call for fetching the current user's profile.
// - React Query hooks should depend on this function, not on apiClient directly.
import type { ApiUserProfileResponse } from "@repo/types";
import { apiFetchWithAuthRetry } from "@/lib/http/apiClient";

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
