import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageFilters } from "@/components/filters/page-filters";
import { useTeamsFromDb, useTeamsFromProvider } from "@/hooks/use-teams";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/table";
import { teamsService } from "@/services/teams.service";
import { unifyTeams, calculateDiffStats } from "@/utils/teams";
import { TeamsTable } from "@/components/teams/teams-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode, DiffFilter } from "@/types";
import type { AdminSyncTeamsResponse } from "@repo/types";

export default function TeamsPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
  } = useTeamsFromDb({
    perPage: 1000,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useTeamsFromProvider();

  // Fetch batches (only seed-teams batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
  } = useBatches("seed-teams", 20);

  // Unify and process data
  const unifiedData = useMemo(
    () => unifyTeams(dbData, providerData),
    [dbData, providerData]
  );

  // Sync mutation (bulk) - removed from UI for now
  // Can be re-enabled when needed

  // Sync single team mutation
  const syncTeamMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      teamsService.syncById(id, false) as Promise<AdminSyncTeamsResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams", "db"] });
      toast.success("Team synced successfully", {
        description: `Synced ${variables.name} (${variables.id})`,
      });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
      }, 500);
    },
    onError: (error: Error, variables) => {
      const errorMessage = error.message || "Sync failed";
      toast.error("Team sync failed", {
        description: `Failed to sync ${variables.name} (${variables.id}): ${errorMessage}`,
      });
    },
  });

  const handleSyncTeam = useCallback(
    async (externalId: string) => {
      // Find team name from unified data
      const team = unifiedData.find((t) => t.externalId === externalId);
      const teamName = team?.name || externalId;
      await syncTeamMutation.mutateAsync({
        id: externalId,
        name: teamName,
      });
    },
    [syncTeamMutation, unifiedData]
  );

  // Calculate diff stats
  const diffStats = useMemo(
    () => calculateDiffStats(unifiedData),
    [unifiedData]
  );

  const isLoading = dbLoading || providerLoading;
  const isFetching = dbFetching || providerFetching;
  const hasError = dbError || providerError;
  const isPartialData = (dbData && !providerData) || (!dbData && providerData);

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-3 sm:p-4 md:p-6">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-2 mb-3 sm:mb-4">
        {/* Filters */}
        <PageFilters />

        {/* Sync Result Panel */}
        {syncResult && syncTimestamp && (
          <div className="border-b pb-2 text-xs text-muted-foreground">
            Synced: {syncResult.data.ok} ok, {syncResult.data.fail} failed
          </div>
        )}

        {/* Sync Error */}
        {syncError && (
          <div className="border-b pb-2 text-xs text-destructive">
            {syncError}
          </div>
        )}

        {/* Partial Data Warning */}
        {isPartialData && (
          <div className="border-b pb-2 text-xs text-muted-foreground">
            {!providerData
              ? "Provider data unavailable"
              : "Database data unavailable"}
          </div>
        )}

        {/* Error State */}
        {hasError && !isPartialData && (
          <div className="border-b pb-2 text-xs text-destructive">
            {dbError ? "DB failed to load" : "Provider failed to load"}
          </div>
        )}

        {/* Mode Switch */}
        <Tabs
          value={viewMode}
          onValueChange={(v) =>
            !isFetching && setViewMode(v as ViewMode | "history")
          }
        >
          <TabsList>
            <TabsTrigger value="provider" disabled={isFetching}>
              Provider
            </TabsTrigger>
            <TabsTrigger value="db" disabled={isFetching}>
              DB
            </TabsTrigger>
            <TabsTrigger value="history" disabled={isFetching}>
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Summary Overview */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-2 py-2 sm:py-1">
          <div className="flex items-center gap-3 sm:gap-4 text-xs pb-1 min-w-max">
            {isFetching ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))
            ) : (
              <>
                <span className="text-muted-foreground">
                  DB:{" "}
                  <span className="text-foreground">{diffStats.dbCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Provider:{" "}
                  <span className="text-foreground">
                    {diffStats.providerCount}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Missing:{" "}
                  <span className="text-foreground">{diffStats.missing}</span>
                </span>
                <span className="text-muted-foreground">
                  Extra:{" "}
                  <span className="text-foreground">{diffStats.extra}</span>
                </span>
                <span className="text-muted-foreground">
                  Mismatch:{" "}
                  <span className="text-foreground">{diffStats.mismatch}</span>
                </span>
                <span className="text-muted-foreground">
                  OK: <span className="text-foreground">{diffStats.ok}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "history" ? (
          <BatchesTable
            batches={batchesData?.data || []}
            isLoading={batchesLoading}
          />
        ) : (
          <TeamsTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={dbData}
            providerData={providerData}
            isLoading={viewMode === "db" ? dbLoading : isLoading}
            error={viewMode === "db" ? dbError : null}
            onSyncTeam={viewMode === "provider" ? handleSyncTeam : undefined}
          />
        )}
      </div>
    </div>
  );
}
