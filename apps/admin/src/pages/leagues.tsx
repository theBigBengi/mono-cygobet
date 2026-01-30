import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLeaguesFromDb, useLeaguesFromProvider } from "@/hooks/use-leagues";
import { useBatches } from "@/hooks/use-batches";
import { leaguesService } from "@/services/leagues.service";
import { unifyLeagues, calculateDiffStats } from "@/utils/leagues";
import { LeaguesTable } from "@/components/leagues/leagues-table";
import { GenericSyncPage } from "./generic-sync-page";
import type { AdminSyncLeaguesResponse } from "@repo/types";

export default function LeaguesPage() {
  const queryClient = useQueryClient();

  const { data: dbData, isLoading: dbLoading, isFetching: dbFetching, error: dbError } =
    useLeaguesFromDb({ perPage: 1000 });
  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useLeaguesFromProvider();
  const { data: batchesData, isLoading: batchesLoading } =
    useBatches("seed-leagues", 20);

  const unifiedData = useMemo(
    () => unifyLeagues(dbData, providerData),
    [dbData, providerData]
  );
  const diffStats = useMemo(() => calculateDiffStats(unifiedData), [unifiedData]);

  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      leaguesService.syncById(id, false) as Promise<AdminSyncLeaguesResponse>,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["leagues", "db"] });
      toast.success("League synced", {
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
      const league = unifiedData.find((l) => l.externalId === externalId);
      await syncMutation.mutateAsync({
        id: externalId,
        name: league?.name || externalId,
      });
    },
    [syncMutation, unifiedData]
  );

  return (
    <GenericSyncPage
      entityLabel="League"
      queryKeyPrefix="leagues"
      batchName="seed-leagues"
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
        <LeaguesTable
          mode={props.mode}
          unifiedData={props.unifiedData}
          diffFilter={props.diffFilter}
          onDiffFilterChange={props.onDiffFilterChange}
          dbData={props.dbData}
          providerData={props.providerData}
          isLoading={props.isLoading}
          error={props.error}
          onSyncLeague={props.onSync}
        />
      )}
    />
  );
}
