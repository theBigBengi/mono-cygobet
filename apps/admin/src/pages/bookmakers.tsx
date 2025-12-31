import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudSync, RefreshCw } from "lucide-react";
import {
  useBookmakersFromDb,
  useBookmakersFromProvider,
} from "@/hooks/use-bookmakers";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/countries/batches-table";
import { bookmakersService } from "@/services/bookmakers.service";
import { unifyBookmakers, calculateDiffStats } from "@/utils/bookmakers";
import { BookmakersTable } from "@/components/bookmakers/bookmakers-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode, AdminSyncBookmakersResponse } from "@repo/types";

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

export default function BookmakersPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [syncResult, setSyncResult] =
    useState<AdminSyncBookmakersResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
    refetch: refetchDb,
  } = useBookmakersFromDb({
    perPage: 1000,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
    refetch: refetchProvider,
  } = useBookmakersFromProvider();

  // Fetch batches (only seed-bookmakers batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches("seed-bookmakers", 20);

  // Sync mutation (bulk)
  const syncMutation = useMutation({
    mutationFn: () =>
      bookmakersService.sync(false) as Promise<AdminSyncBookmakersResponse>,
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncTimestamp(new Date());
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["bookmakers"] });
      toast.success("Bookmakers synced successfully", {
        description: `Synced ${data.ok} bookmakers. ${data.fail > 0 ? `${data.fail} failed.` : ""}`,
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

  // Sync single bookmaker mutation
  const syncBookmakerMutation = useMutation({
    mutationFn: ({ id }: { id: number | string; name: string }) =>
      bookmakersService.syncById(
        id,
        false
      ) as Promise<AdminSyncBookmakersResponse>,
    onSuccess: (_data, variables) => {
      // Invalidate DB query to trigger automatic refetch
      queryClient.invalidateQueries({ queryKey: ["bookmakers", "db"] });
      toast.success("Bookmaker synced successfully", {
        description: `${variables.name} (${variables.id}) has been synced.`,
      });
    },
    onError: (error: Error, variables) => {
      const errorMessage = error.message || "Sync failed";
      toast.error("Bookmaker sync failed", {
        description: `Failed to sync ${variables.name} (${variables.id}): ${errorMessage}`,
      });
    },
  });

  const handleRefresh = () => {
    refetchDb();
    refetchProvider();
    refetchBatches(); // Also refetch batches on refresh
  };

  // Unify and process data
  const unifiedData = useMemo(
    () => unifyBookmakers(dbData, providerData),
    [dbData, providerData]
  );

  const handleSyncBookmaker = useCallback(
    async (externalId: string) => {
      // Find bookmaker name from unified data
      const bookmaker = unifiedData.find((b) => b.externalId === externalId);
      const bookmakerName = bookmaker?.name || externalId;
      await syncBookmakerMutation.mutateAsync({
        id: externalId,
        name: bookmakerName,
      });
    },
    [syncBookmakerMutation, unifiedData]
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
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
              Bookmakers
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
                  <span className="hidden sm:inline">Sync Bookmakers</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sync Result Panel */}
        {syncResult && syncTimestamp && (
          <div className="border-b pb-2 text-xs text-muted-foreground">
            Synced: {syncResult.ok} ok, {syncResult.fail} failed
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
          <BookmakersTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={dbData}
            providerData={providerData}
            isLoading={viewMode === "db" ? dbLoading : isLoading}
            error={viewMode === "db" ? dbError : null}
            onSyncBookmaker={
              viewMode === "provider" ? handleSyncBookmaker : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

