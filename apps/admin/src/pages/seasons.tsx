import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSeasonsFromDb, useSeasonsFromProvider } from "@/hooks/use-seasons";
import { useBatches } from "@/hooks/use-batches";
import { seasonsService } from "@/services/seasons.service";
import { unifySeasons, calculateDiffStats } from "@/utils/seasons";
import { SeasonsTable } from "@/components/seasons/seasons-table";
import { GenericSyncPage } from "./generic-sync-page";
import type {
  AdminSyncSeasonsResponse,
  AdminSeasonsListResponse,
  AdminProviderSeasonsResponse,
} from "@repo/types";

export default function SeasonsPage() {
  const queryClient = useQueryClient();

  const { data: dbData, isLoading: dbLoading, isFetching: dbFetching, error: dbError } =
    useSeasonsFromDb({ perPage: 1000 });
  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useSeasonsFromProvider();
  const { data: batchesData, isLoading: batchesLoading } =
    useBatches("seed-seasons", 20);

  const unifiedData = useMemo(
    () => unifySeasons(dbData, providerData),
    [dbData, providerData]
  );
  const diffStats = useMemo(() => calculateDiffStats(unifiedData), [unifiedData]);

  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      seasonsService.syncById(id, false) as Promise<AdminSyncSeasonsResponse>,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["seasons", "db"] });
      toast.success("Season synced", {
        description: `${vars.name} synced.`,
      });
    },
    onError: (err: Error, vars) => {
      toast.error("Sync failed", {
        description: `${vars.name}: ${err.message}`,
      });
    },
  });

  const syncById = useCallback(
    async (externalId: string) => {
      const season = unifiedData.find((s) => s.externalId === externalId);
      await syncMutation.mutateAsync({
        id: externalId,
        name: season?.name || externalId,
      });
    },
    [syncMutation, unifiedData]
  );

  return (
    <GenericSyncPage<
      import("@/types").UnifiedSeason,
      AdminSeasonsListResponse | undefined,
      AdminProviderSeasonsResponse | undefined
    >
      entityLabel="Season"
      queryKeyPrefix="seasons"
      batchName="seed-seasons"
      dbData={dbData}
      dbLoading={dbLoading}
      dbFetching={dbFetching}
      dbError={dbError as Error | null}
      providerData={providerData}
      providerLoading={providerLoading}
      providerFetching={providerFetching}
      providerError={providerError as Error | null}
      batchesData={batchesData}
      batchesLoading={batchesLoading}
      unifiedData={unifiedData}
      diffStats={diffStats}
      syncById={syncById}
      renderTable={(props) => (
        <SeasonsTable
          mode={props.mode}
          unifiedData={props.unifiedData}
          diffFilter={props.diffFilter}
          onDiffFilterChange={props.onDiffFilterChange}
          dbData={props.dbData}
          providerData={props.providerData}
          isLoading={props.isLoading}
          error={props.error}
          onSyncSeason={props.onSync}
        />
      )}
    />
  );
}
