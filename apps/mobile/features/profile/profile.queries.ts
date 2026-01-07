// React Query hooks for profile data.
// - This is the only place that knows how to fetch profile for React components.
import { useQuery } from "@tanstack/react-query";
import type { ApiUserProfileResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/authGuards";
import { fetchProfile } from "./profile.api";
import { profileKeys } from "./profile.keys";

/**
 * useProfileQuery:
 * - Fetches the current user's profile via fetchProfile().
 * - Enabled only when auth is fully ready for protected routes (no onboarding).
 * - Returns the raw ApiUserProfileResponse; UI components may derive view models.
 */
export function useProfileQuery() {
  const { status, user } = useAuth();

  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiUserProfileResponse, ApiError>({
    queryKey: profileKeys.me(),
    queryFn: fetchProfile,
    enabled,
    meta: { scope: "user" },
  });
}
