import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["admin-settings", "notifications"],
    queryFn: () => settingsService.getNotificationSettings(),
    staleTime: 30_000,
  });
}

export function useLeagueOrderSettings() {
  return useQuery({
    queryKey: ["admin-settings", "league-order"],
    queryFn: () => settingsService.getLeagueOrderSettings(),
    staleTime: Infinity,
  });
}

export function useUpdateLeagueOrderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leagueIds: number[]) =>
      settingsService.updateLeagueOrderSettings(leagueIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings", "league-order"] });
    },
  });
}

export function useTeamOrderSettings() {
  return useQuery({
    queryKey: ["admin-settings", "team-order"],
    queryFn: () => settingsService.getTeamOrderSettings(),
    staleTime: Infinity,
  });
}

export function useUpdateTeamOrderSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamIds: number[]) =>
      settingsService.updateTeamOrderSettings(teamIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings", "team-order"] });
    },
  });
}
