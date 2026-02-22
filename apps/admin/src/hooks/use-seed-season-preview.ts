import { useQuery } from "@tanstack/react-query";
import { syncService } from "@/services/sync.service";

import type { ExternalId } from "@repo/types/sport-data/common";

export function useSeedSeasonPreview(seasonExternalId: ExternalId | null) {
  return useQuery({
    queryKey: ["seed-season-preview", seasonExternalId],
    queryFn: () =>
      seasonExternalId
        ? syncService.getSeedSeasonPreview(seasonExternalId)
        : Promise.reject("No season selected"),
    enabled: seasonExternalId !== null,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: false,
  });
}
