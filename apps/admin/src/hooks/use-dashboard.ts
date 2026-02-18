import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardService.getDashboard(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: () => dashboardService.getAlerts(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useAlertHistory(limit = 50) {
  return useQuery({
    queryKey: ["alerts", "history", limit],
    queryFn: () => dashboardService.getAlertHistory(limit),
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dashboardService.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
