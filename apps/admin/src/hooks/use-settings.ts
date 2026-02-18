import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["admin-settings", "notifications"],
    queryFn: () => settingsService.getNotificationSettings(),
    staleTime: 30_000,
  });
}
