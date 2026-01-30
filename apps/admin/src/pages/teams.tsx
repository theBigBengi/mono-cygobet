import { useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTeamsFromDb, useTeamsFromProvider } from "@/hooks/use-teams";
import { useBatches } from "@/hooks/use-batches";
import { teamsService } from "@/services/teams.service";
import { unifyTeams, calculateDiffStats } from "@/utils/teams";
import { TeamsTable } from "@/components/teams/teams-table";
import { GenericSyncPage } from "./generic-sync-page";
import type {
  AdminSyncTeamsResponse,
  AdminTeamsListResponse,
  AdminProviderTeamsResponse,
} from "@repo/types";

export default function TeamsPage() {
  const queryClient = useQueryClient();

  const { data: dbData, isLoading: dbLoading, isFetching: dbFetching, error: dbError } =
    useTeamsFromDb({ perPage: 1000 });
  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useTeamsFromProvider();
  const { data: batchesData, isLoading: batchesLoading } =
    useBatches("seed-teams", 20);

  const unifiedData = useMemo(
    () => unifyTeams(dbData, providerData),
    [dbData, providerData]
  );
  const diffStats = useMemo(() => calculateDiffStats(unifiedData), [unifiedData]);

  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      teamsService.syncById(id, false) as Promise<AdminSyncTeamsResponse>,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teams", "db"] });
      toast.success("Team synced", {
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
      const team = unifiedData.find((t) => t.externalId === externalId);
      await syncMutation.mutateAsync({
        id: externalId,
        name: team?.name || externalId,
      });
    },
    [syncMutation, unifiedData]
  );

  return (
    <GenericSyncPage<
      import("@/types").UnifiedTeam,
      AdminTeamsListResponse | undefined,
      AdminProviderTeamsResponse | undefined
    >
      entityLabel="Team"
      queryKeyPrefix="teams"
      batchName="seed-teams"
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
        <TeamsTable
          mode={props.mode}
          unifiedData={props.unifiedData}
          diffFilter={props.diffFilter}
          onDiffFilterChange={props.onDiffFilterChange}
          dbData={props.dbData}
          providerData={props.providerData}
          isLoading={props.isLoading}
          error={props.error}
          onSyncTeam={props.onSync}
        />
      )}
    />
  );
}
