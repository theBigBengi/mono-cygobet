import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  useCountriesFromDb,
  useCountriesFromProvider,
} from "@/hooks/use-countries";
import { countriesService } from "@/services/countries.service";
import { unifyCountries, calculateDiffStats } from "@/utils/countries";
import type { ViewMode } from "@/types/countries";
import { CountriesTable } from "@/components/countries/countries-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminSyncCountriesResponse } from "@/types/api";

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

export default function CountriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("provider");
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
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Countries</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isFetching}
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              "Sync Countries"
            )}
          </Button>
        </div>
      </div>

      {/* Sync Result Panel */}
      {syncResult && syncTimestamp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Sync completed
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">{syncError}</span>
        </div>
      )}

      {/* Partial Data Warning */}
      {isPartialData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">
            {!providerData
              ? "Provider data unavailable"
              : "Database data unavailable"}
          </span>
        </div>
      )}

      {/* Error State */}
      {hasError && !isPartialData && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
          <p className="text-destructive font-medium">Error loading data</p>
          <p className="text-sm text-muted-foreground mt-1">
            {dbError ? "DB failed to load" : "Provider failed to load"}
          </p>
        </div>
      )}

      {/* Mode Switch */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => !isFetching && setViewMode(v as ViewMode)}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="provider" disabled={isFetching}>
            Provider
          </TabsTrigger>
          <TabsTrigger value="db" disabled={isFetching}>
            DB
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Overview (shows diff stats in both tabs) */}
      <div className="flex items-center gap-6 text-sm border-b pb-4">
        {isFetching ? (
          // Show skeletons when fetching (refresh)
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))
        ) : (
          // Show actual data - gentle inline stats
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">DB:</span>
              <span className="font-medium">{diffStats.dbCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-medium">{diffStats.providerCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Missing:</span>
              <span className="font-medium text-destructive">
                {diffStats.missing}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Extra:</span>
              <span className="font-medium text-orange-600">
                {diffStats.extra}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Mismatch:</span>
              <span className="font-medium text-yellow-600">
                {diffStats.mismatch}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">OK:</span>
              <span className="font-medium text-green-600">{diffStats.ok}</span>
            </div>
          </>
        )}
      </div>

      {/* Unified Table */}
      <CountriesTable
        mode={viewMode}
        unifiedData={unifiedData}
        diffFilter={diffFilter}
        onDiffFilterChange={setDiffFilter}
        dbData={dbData}
        providerData={providerData}
        isLoading={viewMode === "db" ? dbLoading : isLoading}
        error={viewMode === "db" ? dbError : null}
        onSyncCountry={viewMode === "provider" ? handleSyncCountry : undefined}
      />
    </div>
  );
}
