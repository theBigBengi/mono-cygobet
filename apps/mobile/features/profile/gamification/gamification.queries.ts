import { useQuery } from "@tanstack/react-query";
import type { ApiGamificationResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import { fetchGamification } from "../profile.api";
import { profileKeys } from "../profile.keys";

/**
 * useGamificationQuery:
 * - Fetches gamification data (power score, rank tier, skills, streak, season comparison) for the given user.
 * - Enabled when auth is ready and userId is valid.
 */
export function useGamificationQuery(userId: number | null) {
  const { status, user } = useAuth();

  const enabled =
    isReadyForProtected(status, user) &&
    userId != null &&
    Number.isInteger(userId) &&
    userId > 0;

  return useQuery<ApiGamificationResponse, ApiError>({
    queryKey: profileKeys.gamification(userId ?? 0),
    queryFn: () => fetchGamification(userId!),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: { scope: "user" },
  });
}
