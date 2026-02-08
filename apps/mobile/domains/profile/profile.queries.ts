// React Query hooks for profile data.
// - This is the only place that knows how to fetch profile for React components.
import { useQuery } from "@tanstack/react-query";
import type {
  ApiUserProfileResponse,
  ApiUserStatsResponse,
  ApiHeadToHeadResponse,
  ApiH2HOpponentsResponse,
} from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  fetchProfile,
  fetchUserStats,
  fetchHeadToHead,
  fetchH2HOpponents,
} from "./profile.api";
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

/**
 * useUserStatsQuery:
 * - Fetches user stats for the given userId.
 * - Enabled when auth is ready and userId is valid.
 */
export function useUserStatsQuery(userId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    userId != null &&
    Number.isInteger(userId) &&
    userId > 0;

  return useQuery<ApiUserStatsResponse, ApiError>({
    queryKey: profileKeys.stats(userId ?? 0),
    queryFn: () => fetchUserStats(userId!),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * useHeadToHeadQuery:
 * - Fetches head-to-head comparison between two users.
 * - Enabled when auth is ready and both userId and opponentId are valid.
 */
export function useHeadToHeadQuery(
  userId: number | null,
  opponentId: number | null
) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    userId != null &&
    opponentId != null &&
    Number.isInteger(userId) &&
    userId > 0 &&
    Number.isInteger(opponentId) &&
    opponentId > 0;

  return useQuery<ApiHeadToHeadResponse, ApiError>({
    queryKey: profileKeys.headToHead(userId ?? 0, opponentId ?? 0),
    queryFn: () => fetchHeadToHead(userId!, opponentId!),
    enabled,
    meta: { scope: "user" },
  });
}

/**
 * useH2HOpponentsQuery:
 * - Fetches list of users who share groups with the given user.
 */
export function useH2HOpponentsQuery(userId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    userId != null &&
    Number.isInteger(userId) &&
    userId > 0;

  return useQuery<ApiH2HOpponentsResponse, ApiError>({
    queryKey: profileKeys.h2hOpponents(userId ?? 0),
    queryFn: () => fetchH2HOpponents(userId!),
    enabled,
    meta: { scope: "user" },
  });
}
