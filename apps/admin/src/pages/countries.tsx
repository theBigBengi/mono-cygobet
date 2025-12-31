import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertCircle, CloudSync } from "lucide-react";
import {
  useCountriesFromDb,
  useCountriesFromProvider,
} from "@/hooks/use-countries";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/countries/batches-table";
import { countriesService } from "@/services/countries.service";
import { unifyCountries, calculateDiffStats } from "@/utils/countries";
import type { ViewMode } from "@/types/countries";
import { CountriesTable } from "@/components/countries/countries-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminSyncCountriesResponse } from "@/types/api";

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

export default function CountriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [syncResult, setSyncResult] =
    useState<AdminSyncCountriesResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
    refetch: refetchDb,
  } = useCountriesFromDb({
    perPage: 1000,
    include: "leagues",
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
    refetch: refetchProvider,
  } = useCountriesFromProvider();

  // Fetch batches (only seed-countries batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches("seed-countries", 20);

  // Sync mutation (bulk)
  const syncMutation = useMutation({
    mutationFn: () =>
      countriesService.sync(false) as Promise<AdminSyncCountriesResponse>,
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncTimestamp(new Date());
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      toast.success("Countries synced successfully", {
        description: `Synced ${data.ok} countries. ${data.fail > 0 ? `${data.fail} failed.` : ""}`,
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

  // Sync single country mutation
  const syncCountryMutation = useMutation({
    mutationFn: ({ id }: { id: number | string; name: string }) =>
      countriesService.syncById(
        id,
        false
      ) as Promise<AdminSyncCountriesResponse>,
    onSuccess: (_data, variables) => {
      // Invalidate DB query to trigger automatic refetch
      queryClient.invalidateQueries({ queryKey: ["countries", "db"] });
      toast.success("Country synced successfully", {
        description: `${variables.name} (${variables.id}) has been synced.`,
      });
    },
    onError: (error: Error, variables) => {
      const errorMessage = error.message || "Sync failed";
      toast.error("Country sync failed", {
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
    () => unifyCountries(dbData, providerData),
    [dbData, providerData]
  );

  const handleSyncCountry = useCallback(
    async (externalId: string) => {
      // Find country name from unified data
      const country = unifiedData.find((c) => c.externalId === externalId);
      const countryName = country?.name || externalId;
      await syncCountryMutation.mutateAsync({
        id: externalId,
        name: countryName,
      });
    },
    [syncCountryMutation, unifiedData]
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
    <div className="flex flex-1 flex-col gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">
            Countries
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
            <CloudSync
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
                <span className="hidden sm:inline">Sync Countries</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Result Panel */}
      {syncResult && syncTimestamp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-xs md:text-sm font-medium text-blue-900">
              Sync completed
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 text-xs md:text-sm">
            <div>
              <span className="text-blue-700 font-medium">batchId:</span>{" "}
              <span className="text-blue-900">{syncResult.batchId ?? "—"}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">ok:</span>{" "}
              <span className="text-blue-900">{syncResult.ok}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">fail:</span>{" "}
              <span className="text-blue-900">{syncResult.fail}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">total:</span>{" "}
              <span className="text-blue-900">{syncResult.total}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">timestamp:</span>{" "}
              <span className="text-blue-900">
                {syncTimestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync Error */}
      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 md:p-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-red-800">{syncError}</span>
        </div>
      )}

      {/* Partial Data Warning */}
      {isPartialData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 md:p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm text-yellow-800">
            {!providerData
              ? "Provider data unavailable"
              : "Database data unavailable"}
          </span>
        </div>
      )}

      {/* Error State */}
      {hasError && !isPartialData && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 md:p-4">
          <p className="text-destructive font-medium text-xs sm:text-sm md:text-base">
            Error loading data
          </p>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">
            {dbError ? "DB failed to load" : "Provider failed to load"}
          </p>
        </div>
      )}

      {/* Summary Overview */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs pb-2 min-w-max">
          {isFetching ? (
            // Show skeletons when fetching (refresh)
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))
          ) : (
            // Show actual data - gentle inline stats
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">DB:</span>
                <span className="font-normal text-foreground/80">
                  {diffStats.dbCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">Provider:</span>
                <span className="font-normal text-foreground/80">
                  {diffStats.providerCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">Missing:</span>
                <span className="font-normal text-destructive/80">
                  {diffStats.missing}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">Extra:</span>
                <span className="font-normal text-orange-600/80">
                  {diffStats.extra}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">Mismatch:</span>
                <span className="font-normal text-yellow-600/80">
                  {diffStats.mismatch}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/70">OK:</span>
                <span className="font-normal text-green-600/80">
                  {diffStats.ok}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mode Switch */}
      <div className="border-b">
        <Tabs
          value={viewMode}
          onValueChange={(v) =>
            !isFetching && setViewMode(v as ViewMode | "history")
          }
          className="w-full"
        >
          <TabsList className="h-8 w-auto bg-transparent p-0 gap-0">
            <TabsTrigger
              value="provider"
              disabled={isFetching}
              className="h-8 rounded-none border-b-2 border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground/70"
            >
              Provider
            </TabsTrigger>
            <TabsTrigger
              value="db"
              disabled={isFetching}
              className="h-8 rounded-none border-b-2 border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground/70"
            >
              DB
            </TabsTrigger>
            <TabsTrigger
              value="history"
              disabled={isFetching}
              className="h-8 rounded-none border-b-2 border-transparent bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground/70"
            >
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content based on active tab */}
      {viewMode === "history" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold tracking-tight">
              Seeding / Sync History
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Recent seed-countries batches
            </p>
          </div>
          <BatchesTable
            batches={batchesData?.data || []}
            isLoading={batchesLoading}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">
              {viewMode === "provider"
                ? "Provider Countries"
                : "Database Countries"}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              {viewMode === "provider"
                ? "Compare countries between Provider and Database"
                : "Countries stored in the database"}
            </p>
          </div>
          <CountriesTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={dbData}
            providerData={providerData}
            isLoading={viewMode === "db" ? dbLoading : isLoading}
            error={viewMode === "db" ? dbError : null}
            onSyncCountry={
              viewMode === "provider" ? handleSyncCountry : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
