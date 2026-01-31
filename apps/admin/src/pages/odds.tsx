import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import type { ViewMode, DiffFilter } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageFilters } from "@/components/filters/page-filters";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import {
  MultiSelectCombobox,
  type MultiSelectOption,
} from "@/components/filters/multi-select-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatches } from "@/hooks/use-batches";
import { BatchesTable } from "@/components/table";
import { useBookmakersFromProvider } from "@/hooks/use-bookmakers";
import { useMarketsFromProvider } from "@/hooks/use-markets";
import { useOddsFromDb, useOddsFromProvider } from "@/hooks/use-odds";
import { unifyOdds, calculateDiffStats } from "@/utils/odds";
import { OddsTable } from "@/components/odds/odds-table";

type DateRange = { from: Date | undefined; to: Date | undefined };

export default function OddsPage() {
  const [viewMode, setViewMode] = useState<ViewMode | "history">("provider");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Default date range: today -> +3d (next 3 days)
  const defaultDateRange = useMemo<DateRange>(() => {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + 3);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, []);

  // Applied filters (used for queries)
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRange | undefined
  >(defaultDateRange);
  const [appliedBookmakerIds, setAppliedBookmakerIds] = useState<string[]>([]);
  const [appliedMarketIds, setAppliedMarketIds] = useState<string[]>([]);
  const [appliedWinningOnly, setAppliedWinningOnly] = useState(false);
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState(25);

  // Temp filters (UI-only until submit)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    defaultDateRange
  );
  const [tempBookmakerIds, setTempBookmakerIds] = useState<string[]>([]);
  const [tempMarketIds, setTempMarketIds] = useState<string[]>([]);
  const [tempWinningOnly, setTempWinningOnly] = useState(false);

  const hasUnsavedFilters = useMemo(() => {
    const dateChanged =
      JSON.stringify(tempDateRange) !== JSON.stringify(appliedDateRange);
    const bookmakersChanged =
      JSON.stringify([...tempBookmakerIds].sort()) !==
      JSON.stringify([...appliedBookmakerIds].sort());
    const marketsChanged =
      JSON.stringify([...tempMarketIds].sort()) !==
      JSON.stringify([...appliedMarketIds].sort());
    const winningChanged = tempWinningOnly !== appliedWinningOnly;
    return dateChanged || bookmakersChanged || marketsChanged || winningChanged;
  }, [
    tempDateRange,
    appliedDateRange,
    tempBookmakerIds,
    appliedBookmakerIds,
    tempMarketIds,
    appliedMarketIds,
    tempWinningOnly,
    appliedWinningOnly,
  ]);

  const handleFilterSubmit = () => {
    setAppliedDateRange(tempDateRange);
    setAppliedBookmakerIds(tempBookmakerIds);
    setAppliedMarketIds(tempMarketIds);
    setAppliedWinningOnly(tempWinningOnly);
  };

  // Provider options (external IDs)
  const { data: bookmakersProviderData } = useBookmakersFromProvider();
  const bookmakerOptions: MultiSelectOption[] = useMemo(() => {
    if (!bookmakersProviderData?.data) return [];
    const seen = new Set<string>();
    const out: MultiSelectOption[] = [];
    bookmakersProviderData.data.forEach((b) => {
      const id = String(b.externalId);
      const key = `${id}-${b.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ value: id, label: b.name });
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [bookmakersProviderData]);

  // Convert applied date range to query params
  const [fromDate, toDate] = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to)
      return [undefined, undefined];
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return [
      formatLocalDate(appliedDateRange.from),
      formatLocalDate(appliedDateRange.to),
    ];
  }, [appliedDateRange]);

  const [fromTs, toTs] = useMemo(() => {
    if (!appliedDateRange?.from || !appliedDateRange?.to)
      return [undefined, undefined];
    return [
      Math.floor(appliedDateRange.from.getTime() / 1000),
      Math.floor(appliedDateRange.to.getTime() / 1000),
    ];
  }, [appliedDateRange]);

  const {
    data: dbData,
    isLoading: dbLoading,
    isFetching: dbFetching,
    error: dbError,
  } = useOddsFromDb({
    perPage: 1000,
    bookmakerIds: appliedBookmakerIds.length ? appliedBookmakerIds : undefined,
    marketIds: appliedMarketIds.length ? appliedMarketIds : undefined,
    winning: appliedWinningOnly ? true : undefined,
    fromTs,
    toTs,
  });

  const { data: dbDataPage, isLoading: dbTabLoading } = useOddsFromDb({
    page: dbPage,
    perPage: dbPageSize,
    bookmakerIds: appliedBookmakerIds.length ? appliedBookmakerIds : undefined,
    marketIds: appliedMarketIds.length ? appliedMarketIds : undefined,
    winning: appliedWinningOnly ? true : undefined,
    fromTs,
    toTs,
  });

  const {
    data: providerData,
    isLoading: providerLoading,
    isFetching: providerFetching,
    error: providerError,
  } = useOddsFromProvider({
    from: fromDate,
    to: toDate,
    bookmakerIds: appliedBookmakerIds.length ? appliedBookmakerIds : undefined,
    marketIds: appliedMarketIds.length ? appliedMarketIds : undefined,
    // fixtureStates: ["1"],
  });

  const { data: batchesData, isLoading: batchesLoading } = useBatches(
    "seed-odds",
    20
  );

  // Fetch markets from provider API
  const { data: marketsProviderData } = useMarketsFromProvider();

  // Market options from provider API
  const marketOptions: MultiSelectOption[] = useMemo(() => {
    if (!marketsProviderData?.data) return [];
    return marketsProviderData.data
      .map((m) => ({
        value: String(m.externalId),
        label: m.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [marketsProviderData]);

  const unifiedData = useMemo(
    () => unifyOdds(dbData, providerData),
    [dbData, providerData]
  );
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
              options={bookmakerOptions}
              selectedValues={tempBookmakerIds}
              onSelectionChange={(values) =>
                setTempBookmakerIds(values.map((v) => String(v)))
              }
              placeholder="Bookmakers"
              searchPlaceholder="Search bookmakers..."
              emptyMessage="No bookmakers found."
            />
          </div>
          <div className="flex-1 min-w-0">
            <MultiSelectCombobox
              options={marketOptions}
              selectedValues={tempMarketIds}
              onSelectionChange={(values) =>
                setTempMarketIds(values.map((v) => String(v)))
              }
              placeholder="Markets"
              searchPlaceholder="Search markets..."
              emptyMessage="No markets found."
            />
          </div>
          <Label className="flex items-center gap-2 h-10">
            <Checkbox
              checked={tempWinningOnly}
              onCheckedChange={(checked) =>
                setTempWinningOnly(checked === true)
              }
            />
            <span className="text-sm">Winning only</span>
          </Label>
        </PageFilters>

        {/* Mode Switch with Mobile Filter Button */}
        <div className="flex items-center justify-between gap-2 mt-4 sm:mt-6">
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
          <OddsTable
            mode={viewMode}
            unifiedData={unifiedData}
            diffFilter={diffFilter}
            onDiffFilterChange={setDiffFilter}
            dbData={
              viewMode === "db" && dbDataPage != null ? dbDataPage : dbData
            }
            providerData={providerData}
            isLoading={
              viewMode === "db" ? (dbTabLoading ?? dbLoading) : isLoading
            }
            error={viewMode === "db" ? (dbError as Error | null) : null}
            dbPagination={
              viewMode === "db" && dbDataPage?.pagination
                ? {
                    page: dbDataPage.pagination.page,
                    perPage: dbDataPage.pagination.perPage,
                    totalItems: dbDataPage.pagination.totalItems,
                    totalPages: dbDataPage.pagination.totalPages,
                  }
                : undefined
            }
            onDbPageChange={setDbPage}
            onDbPageSizeChange={(size) => {
              setDbPageSize(size);
              setDbPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
