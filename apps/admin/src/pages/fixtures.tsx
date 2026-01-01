import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudSync, RefreshCw, Search } from "lucide-react";
import {
  useFixturesFromDb,
  useFixturesFromProvider,
} from "@/hooks/use-fixtures";
import { useBatches } from "@/hooks/use-batches";
import { useLeaguesFromDb } from "@/hooks/use-leagues";
import { useCountriesFromDb } from "@/hooks/use-countries";
import { BatchesTable } from "@/components/table";
import { fixturesService } from "@/services/fixtures.service";
import { unifyFixtures, calculateDiffStats } from "@/utils/fixtures";
import { FixturesTable } from "@/components/fixtures/fixtures-table";
import { DateRangePicker } from "@/components/fixtures/date-range-picker";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/fixtures/multi-select-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode, DiffFilter } from "@/types";
import type { AdminSyncFixturesResponse } from "@repo/types";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function FixturesPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [syncResult, setSyncResult] =
    useState<AdminSyncFixturesResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTimestamp, setSyncTimestamp] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Initialize date range: 3 days back and 4 days ahead
  const defaultDateRange = useMemo<DateRange>(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 3);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + 4);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, []);

  // Applied filter states (used in queries)
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRange | undefined
  >(defaultDateRange);
  const [appliedLeagueIds, setAppliedLeagueIds] = useState<number[]>([]);
  const [appliedCountryIds, setAppliedCountryIds] = useState<number[]>([]);

  // Temporary filter states (for UI, not applied until submit)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    defaultDateRange
  );
  const [tempLeagueIds, setTempLeagueIds] = useState<number[]>([]);
  const [tempCountryIds, setTempCountryIds] = useState<number[]>([]);

  // Fetch leagues and countries for combobox options
  const { data: leaguesData } = useLeaguesFromDb({
    perPage: 1000,
  });

  const { data: countriesData } = useCountriesFromDb({
    perPage: 1000,
  });

  // Convert applied date range to ISO strings for API
  const [fromDate, toDate] = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to) {
      return [undefined, undefined];
    }
    return [
      appliedDateRange.from.toISOString().split("T")[0]!,
      appliedDateRange.to.toISOString().split("T")[0]!,
    ];
  }, [appliedDateRange]);

  // Check if filters have unsaved changes
  const hasUnsavedFilters = useMemo(() => {
    const dateChanged =
      JSON.stringify(tempDateRange) !== JSON.stringify(appliedDateRange);
    const leaguesChanged =
      JSON.stringify(tempLeagueIds.sort()) !==
      JSON.stringify(appliedLeagueIds.sort());
    const countriesChanged =
      JSON.stringify(tempCountryIds.sort()) !==
      JSON.stringify(appliedCountryIds.sort());
    return dateChanged || leaguesChanged || countriesChanged;
  }, [
    tempDateRange,
    appliedDateRange,
    tempLeagueIds,
    appliedLeagueIds,
    tempCountryIds,
    appliedCountryIds,
  ]);

  // Handle filter submit
  const handleFilterSubmit = () => {
    setAppliedDateRange(tempDateRange);
    setAppliedLeagueIds(tempLeagueIds);
    setAppliedCountryIds(tempCountryIds);
  };

  // Prepare combobox options
  const leagueOptions: MultiSelectOption[] = useMemo(() => {
    if (!leaguesData?.data) return [];
    return leaguesData.data.map((league) => ({
      value: league.id,
      label: league.name,
    }));
  }, [leaguesData]);

  const countryOptions: MultiSelectOption[] = useMemo(() => {
    if (!countriesData?.data) return [];
    return countriesData.data.map((country) => ({
      value: country.id,
      label: country.name,
    }));
  }, [countriesData]);

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
    refetch: refetchDb,
  } = useFixturesFromDb({
    perPage: 1000,
    leagueIds: appliedLeagueIds.length > 0 ? appliedLeagueIds : undefined,
    countryIds: appliedCountryIds.length > 0 ? appliedCountryIds : undefined,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
    refetch: refetchProvider,
  } = useFixturesFromProvider(
    fromDate,
    toDate,
    undefined,
    appliedLeagueIds.length > 0 ? appliedLeagueIds : undefined,
    appliedCountryIds.length > 0 ? appliedCountryIds : undefined
  );

  // Fetch batches (only seed-fixtures batches)
  const {
    data: batchesData,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches("seed-fixtures", 20);

  // Unify and process data
  const unifiedData = useMemo(
    () => unifyFixtures(dbData, providerData),
    [dbData, providerData]
  );

  // Sync mutation (bulk)
  const syncMutation = useMutation({
    mutationFn: () =>
      fixturesService.sync(false) as Promise<AdminSyncFixturesResponse>,
    onSuccess: (data) => {
      setSyncResult(data);
      setSyncTimestamp(new Date());
      setSyncError(null);
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Fixtures synced successfully", {
        description: `Synced ${data.data.ok} fixtures. ${data.data.fail > 0 ? `${data.data.fail} failed.` : ""}`,
      });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
        refetchBatches();
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

  // Sync single fixture mutation
  const syncFixtureMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      fixturesService.syncById(id, false) as Promise<AdminSyncFixturesResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures", "db"] });
      toast.success("Fixture synced successfully", {
        description: `Synced ${variables.name} (${variables.id})`,
      });
      setTimeout(() => {
        refetchDb();
        refetchProvider();
      }, 500);
    },
    onError: (error: Error, variables) => {
      const errorMessage = error.message || "Sync failed";
      toast.error("Fixture sync failed", {
        description: `Failed to sync ${variables.name} (${variables.id}): ${errorMessage}`,
      });
    },
  });

  const handleSyncFixture = useCallback(
    async (externalId: string) => {
      // Find fixture name from unified data
      const fixture = unifiedData.find((f) => f.externalId === externalId);
      const fixtureName = fixture?.name || externalId;
      await syncFixtureMutation.mutateAsync({
        id: externalId,
        name: fixtureName,
      });
    },
    [syncFixtureMutation, unifiedData]
  );

  const handleRefresh = () => {
    refetchDb();
    refetchProvider();
    refetchBatches();
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
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-2 mb-2 sm:mb-4">
        {/* Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <DateRangePicker
                dateRange={tempDateRange}
                onDateRangeChange={setTempDateRange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <MultiSelectCombobox
                options={leagueOptions}
                selectedValues={tempLeagueIds}
                onSelectionChange={(values) =>
                  setTempLeagueIds(values as number[])
                }
                placeholder="Leagues"
                searchPlaceholder="Search leagues..."
                emptyMessage="No leagues found."
              />
            </div>
            <div className="flex-1 min-w-0">
              <MultiSelectCombobox
                options={countryOptions}
                selectedValues={tempCountryIds}
                onSelectionChange={(values) =>
                  setTempCountryIds(values as number[])
                }
                placeholder="Countries"
                searchPlaceholder="Search countries..."
                emptyMessage="No countries found."
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end sm:justify-start">
            <Button
              variant="default"
              size="icon"
              onClick={handleFilterSubmit}
              disabled={!hasUnsavedFilters || isFetching}
              className="h-10 w-10 shrink-0"
              title="Apply filters"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-10 w-10 shrink-0"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending || isFetching}
              className="h-10 w-10 shrink-0"
              title="Sync fixtures"
            >
              <CloudSync
                className={`h-4 w-4 ${
                  syncMutation.isPending ? "animate-spin" : ""
                }`}
              />
            </Button>
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

        {/* Messages */}
        {syncResult && syncTimestamp && (
          <div className="text-xs text-muted-foreground">
            Synced: {syncResult.data.ok} ok, {syncResult.data.fail} failed
          </div>
        )}
        {syncError && (
          <div className="text-xs text-destructive">{syncError}</div>
        )}
        {isPartialData && (
          <div className="text-xs text-muted-foreground">
            {!providerData
              ? "Provider data unavailable"
              : "Database data unavailable"}
          </div>
        )}
        {hasError && !isPartialData && (
          <div className="text-xs text-destructive">
            {dbError ? "DB failed to load" : "Provider failed to load"}
          </div>
        )}

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
          <FixturesTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={dbData}
            providerData={providerData}
            isLoading={viewMode === "db" ? dbLoading : isLoading}
            error={viewMode === "db" ? dbError : null}
            onSyncFixture={
              viewMode === "provider" ? handleSyncFixture : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
