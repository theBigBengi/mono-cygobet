// domains/preferences/preferences.hooks.ts
// React Query hooks for user preferences domain.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiUserLeaguePreferencesResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import { useAuth } from "@/lib/auth/useAuth";
import { isReadyForProtected } from "@/lib/auth/guards";
import {
  fetchLeaguePreferences,
  updateLeaguePreferences,
  resetLeaguePreferences,
} from "./preferences.api";
import { preferencesKeys } from "./preferences.keys";

/**
 * Hook to fetch user's league order preferences.
 */
export function useLeaguePreferences() {
  const { status, user } = useAuth();
  const enabled = isReadyForProtected(status, user);

  return useQuery<ApiUserLeaguePreferencesResponse, ApiError>({
    queryKey: preferencesKeys.leagueOrder(),
    queryFn: fetchLeaguePreferences,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: { scope: "user" },
  });
}

/**
 * Hook to update user's league order preferences.
 */
export function useUpdateLeaguePreferences() {
  const queryClient = useQueryClient();

  return useMutation<ApiUserLeaguePreferencesResponse, ApiError, number[]>({
    mutationFn: updateLeaguePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.leagueOrder() });
    },
  });
}

/**
 * Hook to reset user's league order preferences to default.
 */
export function useResetLeaguePreferences() {
  const queryClient = useQueryClient();

  return useMutation<ApiUserLeaguePreferencesResponse, ApiError, void>({
    mutationFn: resetLeaguePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.leagueOrder() });
    },
  });
}
