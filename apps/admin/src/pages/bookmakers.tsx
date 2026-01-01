import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageFilters } from "@/components/filters/page-filters";
import {
  useBookmakersFromDb,
  useBookmakersFromProvider,
} from "@/hooks/use-bookmakers";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/table";
import { bookmakersService } from "@/services/bookmakers.service";
import { unifyBookmakers, calculateDiffStats } from "@/utils/bookmakers";
import { BookmakersTable } from "@/components/bookmakers/bookmakers-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode, DiffFilter } from "@/types";
import type { AdminSyncBookmakersResponse } from "@repo/types";

export default function BookmakersPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
  } = useBookmakersFromDb({
    perPage: 1000,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useBookmakersFromProvider();

  // Fetch batches (only seed-bookmakers batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
  } = useBatches("seed-bookmakers", 20);

  // Sync mutation (bulk) - removed from UI for now
  // Can be re-enabled when needed

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
        {/* Filters */}
        <PageFilters />

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
