import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageFilters } from "@/components/filters/page-filters";
import {
  useFixturesFromDb,
  useFixturesFromProvider,
} from "@/hooks/use-fixtures";
import { useBatches } from "@/hooks/use-batches";
import { useLeaguesFromProvider } from "@/hooks/use-leagues";
import { useCountriesFromProvider } from "@/hooks/use-countries";
import { BatchesTable } from "@/components/table";
import { fixturesService } from "@/services/fixtures.service";
import { unifyFixtures, calculateDiffStats } from "@/utils/fixtures";
import { FixturesTable } from "@/components/fixtures/fixtures-table";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/filters/multi-select-combobox";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const [appliedLeagueIds, setAppliedLeagueIds] = useState<string[]>([]); // External IDs
  const [appliedCountryIds, setAppliedCountryIds] = useState<string[]>([]); // External IDs

  // Temporary filter states (for UI, not applied until submit)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    defaultDateRange
  );
  const [tempLeagueIds, setTempLeagueIds] = useState<string[]>([]); // External IDs
  const [tempCountryIds, setTempCountryIds] = useState<string[]>([]); // External IDs

  // Fetch leagues and countries for combobox options - use provider data
  const { data: leaguesProviderData } = useLeaguesFromProvider();
  const { data: countriesProviderData } = useCountriesFromProvider();

  // Convert applied date range to ISO strings for provider API
  // Use local timezone to avoid day shift when converting to UTC
  const [fromDate, toDate] = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to) {
      return [undefined, undefined];
    }
    // Format dates in local timezone to avoid UTC conversion issues
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return [
      formatLocalDate(appliedDateRange.from),
      formatLocalDate(appliedDateRange.to),
    ];
  }, [appliedDateRange]);

  // Convert applied date range to timestamps for DB API
  // Ensure we use day boundaries (00:00:00 to 23:59:59) to match provider API behavior
  const [fromTs, toTs] = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to) {
      return [undefined, undefined];
    }
    // Set from to start of day (00:00:00.000)
    const fromDate = new Date(appliedDateRange.from);
    fromDate.setHours(0, 0, 0, 0);
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);

    // Set to to end of day (23:59:59.999)
    const toDate = new Date(appliedDateRange.to);
    toDate.setHours(23, 59, 59, 999);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    return [fromTimestamp, toTimestamp];
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

  // Prepare combobox options from provider data - use external IDs directly
  const leagueOptions: MultiSelectOption[] = useMemo(() => {
    if (!leaguesProviderData?.data) return [];

    const seen = new Set<string>(); // Track unique combinations to avoid duplicates
    const options: MultiSelectOption[] = [];

    leaguesProviderData.data.forEach((league) => {
      const externalId = String(league.externalId);
      const key = `${externalId}-${league.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          value: externalId,
          label: league.name,
        });
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [leaguesProviderData]);

  const countryOptions: MultiSelectOption[] = useMemo(() => {
    if (!countriesProviderData?.data) return [];

    const seen = new Set<string>(); // Track unique combinations to avoid duplicates
    const options: MultiSelectOption[] = [];

    countriesProviderData.data.forEach((country) => {
      const externalId = String(country.externalId);
      const key = `${externalId}-${country.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          value: externalId,
          label: country.name,
        });
      }
    });

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [countriesProviderData]);

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
    fromTs,
    toTs,
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
  const { data: batchesData, isLoading: batchesLoading } = useBatches(
    "seed-fixtures",
    20
  );

  // Unify and process data
  const unifiedData = useMemo(
    () => unifyFixtures(dbData, providerData),
    [dbData, providerData]
  );

  // Sync mutation (bulk) - removed from UI for now
  // const syncMutation = useMutation({...});

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
      <div className="flex-shrink-0 mb-2 sm:mb-4">
        {/* Filters */}
        <PageFilters
          showSubmit={true}
          onSubmit={handleFilterSubmit}
          submitDisabled={!hasUnsavedFilters || isFetching}
          submitTitle="Apply filters"
          hideMobileButton={true}
          drawerOpen={drawerOpen}
          onDrawerOpenChange={setDrawerOpen}
        >
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
                setTempLeagueIds(values.map((v) => String(v)))
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
                setTempCountryIds(values.map((v) => String(v)))
              }
              placeholder="Countries"
              searchPlaceholder="Search countries..."
              emptyMessage="No countries found."
            />
          </div>
        </PageFilters>

        {/* Mode Switch with Mobile Filter Button */}
        <div className="flex items-center justify-between gap-2 sm:mt-6">
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
          {/* Mobile Filter Button */}
          <div className="flex sm:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              className="h-9 w-9 shrink-0"
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
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

        {/* Summary Overview (hidden on mobile) */}
        <div className="hidden sm:block overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-2 py-2 sm:py-1">
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
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["fixtures", "db"] });
              setTimeout(() => {
                refetchDb();
                refetchProvider();
              }, 500);
            }}
          />
        )}
      </div>
    </div>
  );
}
