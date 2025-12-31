import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { AdminSyncCountriesResponse } from "@/types/api";

type DiffFilter = "all" | "missing" | "mismatch" | "extra" | "ok";

export default function CountriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("diff");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [syncResult, setSyncResult] =
    useState<AdminSyncCountriesResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const {
    data: dbData,
    isLoading: dbLoading,
    error: dbError,
    refetch: refetchDb,
  } = useCountriesFromDb({
    perPage: 1000,
    include: "leagues",
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    error: providerError,
    refetch: refetchProvider,
  } = useCountriesFromProvider();

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () =>
      countriesService.sync(false) as Promise<AdminSyncCountriesResponse>,
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncTimestamp(new Date());
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
      }, 500);
    },
    onError: (error: Error) => {
      setSyncError(error.message || "Sync failed");
      setSyncResult(null);
      setSyncTimestamp(null);
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

  // Debug logging
  console.log("[CountriesPage] dbData:", dbData);
  console.log("[CountriesPage] dbLoading:", dbLoading);
  console.log("[CountriesPage] dbError:", dbError);
  console.log("[CountriesPage] viewMode:", viewMode);

  // Calculate diff stats
  const diffStats = useMemo(
    () => calculateDiffStats(unifiedData),
    [unifiedData]
  );

  const isLoading = dbLoading || providerLoading;
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
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
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
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="diff">Diff</TabsTrigger>
          <TabsTrigger value="db">DB</TabsTrigger>
          <TabsTrigger value="provider">Provider</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards (Diff mode only) */}
      {viewMode === "diff" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                DB Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{diffStats.dbCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Provider Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {diffStats.providerCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Missing in DB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {diffStats.missing}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Extra in DB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {diffStats.extra}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Mismatch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {diffStats.mismatch}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                OK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {diffStats.ok}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unified Table */}
      <CountriesTable
        mode={viewMode}
        unifiedData={unifiedData}
        diffFilter={diffFilter}
        onDiffFilterChange={setDiffFilter}
        dbData={dbData}
        providerData={providerData}
        isLoading={
          viewMode === "db"
            ? dbLoading
            : viewMode === "provider"
              ? providerLoading
              : isLoading
        }
        error={
          viewMode === "db"
            ? dbError
            : viewMode === "provider"
              ? providerError
              : null
        }
      />
    </div>
  );
}
