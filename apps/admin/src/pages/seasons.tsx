import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudSync, RefreshCw } from "lucide-react";
import { useSeasonsFromDb, useSeasonsFromProvider } from "@/hooks/use-seasons";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/table";
import { seasonsService } from "@/services/seasons.service";
import { unifySeasons, calculateDiffStats } from "@/utils/seasons";
import { SeasonsTable } from "@/components/seasons/seasons-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode, DiffFilter } from "@/types";
import type { AdminSyncSeasonsResponse } from "@repo/types";

export default function SeasonsPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [syncResult, setSyncResult] = useState<AdminSyncSeasonsResponse | null>(
    null
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
    refetch: refetchDb,
  } = useSeasonsFromDb({
    perPage: 1000,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
    refetch: refetchProvider,
  } = useSeasonsFromProvider();

  // Fetch batches (only seed-seasons batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches("seed-seasons", 20);

  // Unify and process data
  const unifiedData = useMemo(
    () => unifySeasons(dbData, providerData),
    [dbData, providerData]
  );

  // Sync mutation (bulk)
  const syncMutation = useMutation({
    mutationFn: () =>
      seasonsService.sync(false) as Promise<AdminSyncSeasonsResponse>,
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncTimestamp(new Date());
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      toast.success("Seasons synced successfully", {
        description: `Synced ${data.data.ok} seasons. ${data.data.fail > 0 ? `${data.data.fail} failed.` : ""}`,
      });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
        refetchBatches(); // Refetch batches after sync
      }, 500);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Sync failed";
      setSyncError(errorMessage);
      setSyncResult(null);
      setSyncTimestamp(null);
      toast.error("Sync failed", {
        description: errorMessage,
      });
    },
  });

  // Sync single season mutation
  const syncSeasonMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      seasonsService.syncById(id, false) as Promise<AdminSyncSeasonsResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["seasons", "db"] });
      toast.success("Season synced successfully", {
        description: `Synced ${variables.name} (${variables.id})`,
      });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
      }, 500);
    },
    onError: (error: Error, variables) => {
      const errorMessage = error.message || "Sync failed";
      toast.error("Season sync failed", {
        description: `Failed to sync ${variables.name} (${variables.id}): ${errorMessage}`,
      });
    },
  });

  const handleSyncSeason = useCallback(
    async (externalId: string) => {
      // Find season name from unified data
      const season = unifiedData.find((s) => s.externalId === externalId);
      const seasonName = season?.name || externalId;
      await syncSeasonMutation.mutateAsync({
        id: externalId,
        name: seasonName,
      });
    },
    [syncSeasonMutation, unifiedData]
  );

  const handleRefresh = () => {
    refetchDb();
    refetchProvider();
    refetchBatches(); // Also refetch batches on refresh
  };

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
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
              Seasons
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="!px-2 sm:!px-3"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""} max-sm:mr-0 sm:mr-2`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isFetching}
              className="!px-2 sm:!px-3"
            >
              {syncMutation.isPending ? (
                <>
                  <CloudSync className="h-4 w-4 animate-spin max-sm:mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : (
                <>
                  <CloudSync className="h-4 w-4 max-sm:mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Sync Seasons</span>
                </>
              )}
            </Button>
          </div>
        </div>

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
        <div className="border-b">
          <Tabs
            value={viewMode}
            onValueChange={(v) =>
              !isFetching && setViewMode(v as ViewMode | "history")
            }
            className="w-full"
          >
            <TabsList className="h-7 w-auto bg-transparent p-0 gap-0">
              <TabsTrigger
                value="provider"
                disabled={isFetching}
                className="h-7 rounded-none bg-transparent px-3 py-1 text-xs text-muted-foreground shadow-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground/60"
              >
                Provider
              </TabsTrigger>
              <TabsTrigger
                value="db"
                disabled={isFetching}
                className="h-7 rounded-none bg-transparent px-3 py-1 text-xs text-muted-foreground shadow-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground/60"
              >
                DB
              </TabsTrigger>
              <TabsTrigger
                value="history"
                disabled={isFetching}
                className="h-7 rounded-none bg-transparent px-3 py-1 text-xs text-muted-foreground shadow-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-foreground data-[state=active]:text-foreground hover:text-foreground/60"
              >
                History
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
          <SeasonsTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={dbData}
            providerData={providerData}
            isLoading={viewMode === "db" ? dbLoading : isLoading}
            error={viewMode === "db" ? dbError : null}
            onSyncSeason={
              viewMode === "provider" ? handleSyncSeason : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
