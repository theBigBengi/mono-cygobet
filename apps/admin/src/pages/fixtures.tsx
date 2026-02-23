import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarIcon, Check, ChevronsUpDown, Filter, Loader2, Radio, RefreshCw, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { format, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { AttentionFixturesTable } from "@/components/fixtures/AttentionFixturesTable";
import {
  useLiveFixtures,
  useFixturesAttention,
  useFixtureSearch,
} from "@/hooks/use-fixtures";
import { HeaderActions } from "@/contexts/header-actions";
import { fixturesService } from "@/services/fixtures.service";
import { leaguesService } from "@/services/leagues.service";
import type {
  AdminSyncFixturesResponse,
  AdminFixturesListResponse,
  FixtureIssueType,
  FixtureDTO,
} from "@repo/types";

type FixturesTab = "live" | "attention" | "search";

type AttentionFilters = {
  issueType: FixtureIssueType | "all";
  fromDate: Date | undefined;
  toDate: Date | undefined;
  leagueId: number | undefined;
  search: string;
};
const defaultAttentionFilters: AttentionFilters = {
  issueType: "all",
  fromDate: undefined,
  toDate: undefined,
  leagueId: undefined,
  search: "",
};

type SearchFilters = {
  query: string;
  leagueId: number | undefined;
  leagueName: string;
  state: string;
  fromDate: Date | undefined;
  toDate: Date | undefined;
};
const defaultSearchFilters: SearchFilters = {
  query: "",
  leagueId: undefined,
  leagueName: "",
  state: "",
  fromDate: undefined,
  toDate: undefined,
};

// ═══════════════════════════════════════════════════════════════
// Main Page — only owns tab state + live data for badge counts
// ═══════════════════════════════════════════════════════════════

export default function FixturesPage() {
  const [tab, setTab] = useState<FixturesTab>("attention");
  const queryClient = useQueryClient();

  // Live data — always active for badge count
  const { db: liveDb, provider: liveProvider } = useLiveFixtures();
  const liveCount = Math.max(
    liveDb.data?.data?.length ?? 0,
    liveProvider.data?.data?.length ?? 0
  );
  const liveFetching = liveDb.isFetching || liveProvider.isFetching;

  // Attention count — set by child via callback
  const [attentionCount, setAttentionCount] = useState(0);

  // Preserve applied filters across tab switches (refs don't cause re-renders)
  const attentionFiltersRef = useRef<AttentionFilters>(defaultAttentionFilters);
  const searchFiltersRef = useRef<SearchFilters>(defaultSearchFilters);

  const refetchLive = useCallback(() => {
    void liveDb.refetch();
    void liveProvider.refetch();
  }, [liveDb, liveProvider]);

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <HeaderActions>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["fixtures"] })}
          disabled={liveFetching}
        >
          <RefreshCw className={`h-4 w-4 ${liveFetching ? "animate-spin" : ""}`} />
        </Button>
      </HeaderActions>

      {/* Tabs */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as FixturesTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="flex w-full sm:inline-flex sm:w-auto">
            <TabsTrigger value="live" className="gap-1.5 flex-1 sm:flex-initial">
              <Radio className="h-3.5 w-3.5" />
              Live
              {liveCount > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px] border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400"
                >
                  {liveCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="attention" className="gap-1.5 flex-1 sm:flex-initial">
              <AlertTriangle className="h-3.5 w-3.5" />
              Attention
              {attentionCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
                >
                  {attentionCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5 flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5" />
              Search
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content — each tab is its own component with isolated state */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "live" && (
          <LiveFixturesSection
            dbFixtures={liveDb.data?.data ?? []}
            providerFixtures={liveProvider.data?.data ?? []}
            trackedLeagueExternalIds={liveProvider.data?.trackedLeagueExternalIds ?? []}
            isLoading={liveDb.isLoading || liveProvider.isLoading}
            isFetching={liveFetching}
            onRefresh={refetchLive}
          />
        )}
        {tab === "attention" && (
          <AttentionTabContent
            initialFilters={attentionFiltersRef.current}
            onFiltersChange={(f) => { attentionFiltersRef.current = f; }}
            onCountChange={setAttentionCount}
          />
        )}
        {tab === "search" && (
          <SearchTabContent
            initialFilters={searchFiltersRef.current}
            onFiltersChange={(f) => { searchFiltersRef.current = f; }}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Attention Tab — owns ALL attention state, mutations, rendering
// ═══════════════════════════════════════════════════════════════

function AttentionTabContent({
  initialFilters,
  onFiltersChange,
  onCountChange,
}: {
  initialFilters: AttentionFilters;
  onFiltersChange: (f: AttentionFilters) => void;
  onCountChange: (n: number) => void;
}) {
  const queryClient = useQueryClient();

  // ─── Filter state ───
  const [filters, setFilters] = useState<AttentionFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<AttentionFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // ─── Filter derived values ───
  const hasAppliedDateRange =
    appliedFilters.fromDate !== undefined && appliedFilters.toDate !== undefined;

  const filtersAreDirty =
    filters.issueType !== appliedFilters.issueType ||
    filters.fromDate?.getTime() !== appliedFilters.fromDate?.getTime() ||
    filters.toDate?.getTime() !== appliedFilters.toDate?.getTime() ||
    filters.leagueId !== appliedFilters.leagueId ||
    filters.search !== appliedFilters.search;

  const hasActiveFilters =
    appliedFilters.issueType !== "all" ||
    hasAppliedDateRange ||
    appliedFilters.leagueId !== undefined ||
    appliedFilters.search !== "";

  const activeFilterCount =
    (appliedFilters.issueType !== "all" ? 1 : 0) +
    (hasAppliedDateRange ? 1 : 0) +
    (appliedFilters.leagueId !== undefined ? 1 : 0) +
    (appliedFilters.search !== "" ? 1 : 0);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1);
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    setFilters(defaultAttentionFilters);
    setAppliedFilters(defaultAttentionFilters);
    setPage(1);
    onFiltersChange(defaultAttentionFilters);
  }, [onFiltersChange]);

  // ─── Data fetching ───
  const {
    data: attentionData,
    isLoading: attentionLoading,
    isFetching: attentionFetching,
  } = useFixturesAttention({
    issueType: appliedFilters.issueType,
    search: appliedFilters.search || undefined,
    fromTs: appliedFilters.fromDate
      ? Math.floor(startOfDay(appliedFilters.fromDate).getTime() / 1000)
      : undefined,
    toTs: appliedFilters.toDate
      ? Math.floor(endOfDay(appliedFilters.toDate).getTime() / 1000)
      : undefined,
    leagueId: appliedFilters.leagueId,
    page,
    perPage,
  });

  // ─── Update parent badge count ───
  useEffect(() => {
    onCountChange(attentionData?.pagination.totalItems ?? 0);
  }, [attentionData?.pagination.totalItems, onCountChange]);

  const pageItems = attentionData?.data ?? [];
  const totalMatchingCount = attentionData?.pagination.totalItems ?? 0;

  // ─── Sync mutation ───
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      fixturesService.syncById(id, false) as Promise<AdminSyncFixturesResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Fixture synced", { description: `Synced ${variables.name}` });
      setSyncingIds((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
    },
    onError: (error: Error, variables) => {
      toast.error("Sync failed", { description: error.message });
      setSyncingIds((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
    },
  });

  const handleSync = useCallback((externalId: string, name: string) => {
    setSyncingIds((prev) => new Set(prev).add(externalId));
    syncMutation.mutate({ id: externalId, name });
  }, [syncMutation]);

  // ─── Resettle mutation ───
  const [resettlingIds, setResettlingIds] = useState<Set<number>>(new Set());
  const resettleMutation = useMutation({
    mutationFn: (fixtureId: number) => fixturesService.resettle(fixtureId),
    onSuccess: (result, fixtureId) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Re-settlement complete", {
        description: `${result.groupsAffected} group(s), ${result.predictionsRecalculated} prediction(s)`,
      });
      setResettlingIds((prev) => { const next = new Set(prev); next.delete(fixtureId); return next; });
    },
    onError: (error: Error, fixtureId) => {
      toast.error("Re-settle failed", { description: error.message });
      setResettlingIds((prev) => { const next = new Set(prev); next.delete(fixtureId); return next; });
    },
  });

  const handleResettle = useCallback((fixtureId: number) => {
    setResettlingIds((prev) => new Set(prev).add(fixtureId));
    resettleMutation.mutate(fixtureId);
  }, [resettleMutation]);

  // ─── Bulk sync (chunked) ───
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const handleBulkSync = useCallback(
    async (externalIds: string[]) => {
      setBulkSyncing(true);
      setBulkProgress("");

      const CHUNK_SIZE = 100;
      const chunks: string[][] = [];
      for (let i = 0; i < externalIds.length; i += CHUNK_SIZE) {
        chunks.push(externalIds.slice(i, i + CHUNK_SIZE));
      }

      let totalOk = 0;
      let totalFail = 0;
      let totalCount = 0;

      try {
        for (let i = 0; i < chunks.length; i++) {
          if (chunks.length > 1) {
            setBulkProgress(`Syncing batch ${i + 1}/${chunks.length}...`);
          }
          const result = await fixturesService.syncBulk(chunks[i]);
          totalOk += result.data.ok;
          totalFail += result.data.fail;
          totalCount += result.data.total;
        }
        queryClient.invalidateQueries({ queryKey: ["fixtures"] });
        toast.success("Bulk sync complete", {
          description: `${totalOk} synced, ${totalFail} failed (${totalCount} total)`,
        });
      } catch (error: unknown) {
        toast.error("Bulk sync failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setBulkSyncing(false);
        setBulkProgress("");
      }
    },
    [queryClient]
  );

  const issueCounts = attentionData?.issueCounts;

  return (
    <div>
      {/* Sticky filters */}
      <div className="sticky top-0 z-10 bg-background sm:pb-2">
        {/* ── Desktop: filters ── */}
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <div className="relative min-w-0 flex-[3]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter" && filtersAreDirty) applyFilters(); }}
              placeholder="Search..."
              className="h-8 pl-7 pr-7 text-xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DateRangePickerButton
            from={filters.fromDate}
            to={filters.toDate}
            onChange={(from, to) => setFilters((f) => ({ ...f, fromDate: from, toDate: to }))}
            className="h-8 min-w-0 flex-[2] text-xs"
          />
          <Select
            value={filters.issueType}
            onValueChange={(v) => setFilters((f) => ({ ...f, issueType: v as FixtureIssueType | "all" }))}
          >
            <SelectTrigger className="h-8 min-w-0 flex-[1.5] text-xs">
              <SelectValue placeholder="Issue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues{issueCounts ? ` (${Object.values(issueCounts).reduce((a, b) => a + b, 0)})` : ""}</SelectItem>
              {(issueCounts?.stuck ?? 0) > 0 && <SelectItem value="stuck">Stuck LIVE ({issueCounts!.stuck})</SelectItem>}
              {(issueCounts?.overdue ?? 0) > 0 && <SelectItem value="overdue">Overdue NS ({issueCounts!.overdue})</SelectItem>}
              {(issueCounts?.noScores ?? 0) > 0 && <SelectItem value="noScores">No Scores ({issueCounts!.noScores})</SelectItem>}
              {(issueCounts?.unsettled ?? 0) > 0 && <SelectItem value="unsettled">Unsettled ({issueCounts!.unsettled})</SelectItem>}
              {(issueCounts?.scoreMismatch ?? 0) > 0 && <SelectItem value="scoreMismatch">Score Mismatch ({issueCounts!.scoreMismatch})</SelectItem>}
            </SelectContent>
          </Select>
          <LeagueCombobox
            leagues={attentionData?.availableLeagues ?? []}
            value={filters.leagueId}
            onChange={(v) => setFilters((f) => ({ ...f, leagueId: v }))}
            className="h-8 min-w-0 flex-[1.5] text-xs"
          />
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs shrink-0"
            onClick={applyFilters}
            disabled={!filtersAreDirty || attentionFetching}
          >
            <Filter className="mr-1 h-3 w-3" />
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 px-2 text-xs shrink-0", !hasActiveFilters && "invisible")}
            onClick={resetFilters}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <AttentionFixturesTable
        data={pageItems}
        isLoading={attentionLoading}
        onSync={handleSync}
        onResettle={handleResettle}
        syncingIds={syncingIds}
        resettlingIds={resettlingIds}
        onBulkSync={handleBulkSync}
        bulkSyncing={bulkSyncing}
        bulkProgress={bulkProgress}
        allExternalIds={attentionData?.allExternalIds}
        totalMatchingCount={totalMatchingCount}
        mobileFilterSlot={
          <AttentionMobileFilterDrawer
            filters={filters}
            setFilters={setFilters}
            issueCounts={issueCounts}
            availableLeagues={attentionData?.availableLeagues ?? []}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
            filtersAreDirty={filtersAreDirty}
            activeFilterCount={activeFilterCount}
          />
        }
      />

      {/* Pagination */}
      {attentionData && attentionData.pagination.totalPages > 1 && (
        <SimplePagination
          page={attentionData.pagination.page}
          totalPages={attentionData.pagination.totalPages}
          totalItems={attentionData.pagination.totalItems}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(v) => {
            setPerPage(v);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Search Tab — owns ALL search state, rendering
// ═══════════════════════════════════════════════════════════════

function SearchTabContent({
  initialFilters,
  onFiltersChange,
}: {
  initialFilters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
}) {
  // ─── Filter state ───
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initialFilters);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtersAreDirty =
    searchFilters.query !== appliedFilters.query ||
    searchFilters.leagueId !== appliedFilters.leagueId ||
    searchFilters.state !== appliedFilters.state ||
    searchFilters.fromDate?.getTime() !== appliedFilters.fromDate?.getTime() ||
    searchFilters.toDate?.getTime() !== appliedFilters.toDate?.getTime();

  const hasDateRange =
    searchFilters.fromDate !== undefined && searchFilters.toDate !== undefined;
  const hasAppliedDateRange =
    appliedFilters.fromDate !== undefined && appliedFilters.toDate !== undefined;

  const hasActiveFilters =
    appliedFilters.query !== "" ||
    appliedFilters.leagueId !== undefined ||
    appliedFilters.state !== "" ||
    hasAppliedDateRange;

  const activeFilterCount =
    (appliedFilters.query !== "" ? 1 : 0) +
    (appliedFilters.leagueId !== undefined ? 1 : 0) +
    (appliedFilters.state !== "" ? 1 : 0) +
    (hasAppliedDateRange ? 1 : 0);

  const pendingFiltersAreValid =
    searchFilters.query.length >= 2 ||
    searchFilters.leagueId !== undefined ||
    searchFilters.state !== "" ||
    hasDateRange;

  const applyFilters = useCallback(() => {
    setAppliedFilters(searchFilters);
    setPage(1);
    setFilterDrawerOpen(false);
    onFiltersChange(searchFilters);
  }, [searchFilters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    setSearchFilters(defaultSearchFilters);
    setAppliedFilters(defaultSearchFilters);
    setPage(1);
    onFiltersChange(defaultSearchFilters);
  }, [onFiltersChange]);

  // ─── Data fetching ───
  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useFixtureSearch({
    q: appliedFilters.query || undefined,
    leagueId: appliedFilters.leagueId,
    state: appliedFilters.state || undefined,
    fromTs: appliedFilters.fromDate
      ? Math.floor(startOfDay(appliedFilters.fromDate).getTime() / 1000)
      : undefined,
    toTs: appliedFilters.toDate
      ? Math.floor(endOfDay(appliedFilters.toDate).getTime() / 1000)
      : undefined,
    page,
    perPage: 25,
  });

  return (
    <div>
      {/* Sticky filters */}
      <div className="sticky top-0 z-10 bg-background pb-2">
        {/* ── Mobile: filter button ── */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setFilterDrawerOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetFilters}>
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── Mobile: search filter drawer ── */}
        <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen} shouldScaleBackground={false}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Search Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-4 pb-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchFilters.query}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, query: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && pendingFiltersAreValid) applyFilters(); }}
                    placeholder="Team or fixture name..."
                    className="h-9 pl-8 pr-8 text-sm"
                  />
                  {searchFilters.query && (
                    <button
                      type="button"
                      onClick={() => setSearchFilters((f) => ({ ...f, query: "" }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">State</label>
                <Select
                  value={searchFilters.state || "__all__"}
                  onValueChange={(v) => setSearchFilters((f) => ({ ...f, state: v === "__all__" ? "" : v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All States</SelectItem>
                    <SelectItem value="NS">NS</SelectItem>
                    <SelectItem value="INPLAY_1ST_HALF">1st Half</SelectItem>
                    <SelectItem value="HT">HT</SelectItem>
                    <SelectItem value="INPLAY_2ND_HALF">2nd Half</SelectItem>
                    <SelectItem value="FT">FT</SelectItem>
                    <SelectItem value="AET">AET</SelectItem>
                    <SelectItem value="FT_PEN">FT Pen</SelectItem>
                    <SelectItem value="POSTPONED">Postponed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="ABANDONED">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">League</label>
                <LeagueSearchCombobox
                  value={searchFilters.leagueId}
                  displayName={searchFilters.leagueName}
                  onChange={(id, name) => setSearchFilters((f) => ({ ...f, leagueId: id, leagueName: name }))}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date range</label>
                <DateRangePickerButton
                  from={searchFilters.fromDate}
                  to={searchFilters.toDate}
                  onChange={(from, to) => setSearchFilters((f) => ({ ...f, fromDate: from, toDate: to }))}
                  className="h-9 text-sm w-full"
                />
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={applyFilters} disabled={!pendingFiltersAreValid}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              {hasActiveFilters && (
                <DrawerClose asChild>
                  <Button variant="outline" onClick={resetFilters}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset All
                  </Button>
                </DrawerClose>
              )}
              <DrawerClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* ── Desktop: single row of filters ── */}
        <div className="hidden sm:flex sm:items-center sm:gap-2">
          <div className="relative min-w-0 flex-[3]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchFilters.query}
              onChange={(e) => setSearchFilters((f) => ({ ...f, query: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter" && pendingFiltersAreValid) applyFilters(); }}
              placeholder="Search..."
              className="h-8 pl-7 pr-7 text-xs"
            />
            {searchFilters.query && (
              <button
                type="button"
                onClick={() => setSearchFilters((f) => ({ ...f, query: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DateRangePickerButton
            from={searchFilters.fromDate}
            to={searchFilters.toDate}
            onChange={(from, to) => setSearchFilters((f) => ({ ...f, fromDate: from, toDate: to }))}
            className="h-8 min-w-0 flex-[2] text-xs"
          />
          <Select
            value={searchFilters.state || "__all__"}
            onValueChange={(v) => setSearchFilters((f) => ({ ...f, state: v === "__all__" ? "" : v }))}
          >
            <SelectTrigger className="h-8 min-w-0 flex-[1.5] text-xs">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All States</SelectItem>
              <SelectItem value="NS">NS</SelectItem>
              <SelectItem value="INPLAY_1ST_HALF">1st Half</SelectItem>
              <SelectItem value="HT">HT</SelectItem>
              <SelectItem value="INPLAY_2ND_HALF">2nd Half</SelectItem>
              <SelectItem value="FT">FT</SelectItem>
              <SelectItem value="AET">AET</SelectItem>
              <SelectItem value="FT_PEN">FT Pen</SelectItem>
              <SelectItem value="POSTPONED">Postponed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="ABANDONED">Abandoned</SelectItem>
            </SelectContent>
          </Select>
          <LeagueSearchCombobox
            value={searchFilters.leagueId}
            displayName={searchFilters.leagueName}
            onChange={(id, name) => setSearchFilters((f) => ({ ...f, leagueId: id, leagueName: name }))}
            className="h-8 min-w-0 flex-[1.5] text-xs"
          />
          <Button
            size="sm"
            className="h-8 px-2.5 text-xs shrink-0"
            onClick={applyFilters}
            disabled={!filtersAreDirty || searchFetching || !pendingFiltersAreValid}
          >
            <Filter className="mr-1 h-3 w-3" />
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 px-2 text-xs shrink-0", !hasActiveFilters && "invisible")}
            onClick={resetFilters}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Results */}
      {!hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Use the filters above to search fixtures
          </p>
        </div>
      ) : searchLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !searchData?.data.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No fixtures found matching your filters
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground mb-2">
            {searchData.pagination.totalItems} result
            {searchData.pagination.totalItems !== 1 ? "s" : ""}
            {searchFetching && " (refreshing...)"}
          </div>
          {/* Mobile: Card layout */}
          <div className="space-y-2 sm:hidden">
            {searchData.data.map((fixture) => (
              <Link
                key={fixture.id}
                to={`/fixtures/${fixture.id}`}
                className="block rounded-lg border p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-tight">
                    {fixture.name}
                  </span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {fixture.state}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {fixture.homeScore90 != null && fixture.awayScore90 != null && (
                    <span className="font-medium text-foreground">
                      {fixture.homeScore90} - {fixture.awayScore90}
                    </span>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(fixture.startIso), { addSuffix: true })}
                  </span>
                  {fixture.league && <span>{fixture.league.name}</span>}
                  {fixture.issue && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
                    >
                      {fixture.issue}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fixture</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="hidden md:table-cell">Score</TableHead>
                  <TableHead className="hidden md:table-cell">Start</TableHead>
                  <TableHead className="hidden lg:table-cell">Issue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchData.data.map((fixture) => (
                  <TableRow key={fixture.id}>
                    <TableCell>
                      <Link
                        to={`/fixtures/${fixture.id}`}
                        className="font-medium hover:underline"
                      >
                        {fixture.name}
                      </Link>
                      {fixture.league && (
                        <p className="text-xs text-muted-foreground">
                          {fixture.league.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {fixture.state}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {fixture.homeScore90 != null && fixture.awayScore90 != null
                        ? `${fixture.homeScore90} - ${fixture.awayScore90}`
                        : fixture.result ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(fixture.startIso), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {fixture.issue ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
                        >
                          {fixture.issue}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link to={`/fixtures/${fixture.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {searchData.pagination.totalPages > 1 && (
            <SimplePagination
              page={searchData.pagination.page}
              totalPages={searchData.pagination.totalPages}
              totalItems={searchData.pagination.totalItems}
              perPage={25}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Live Fixtures Section — owns its own sync state + useMemo
// ═══════════════════════════════════════════════════════════════

type DbFixture = AdminFixturesListResponse["data"][number];

function hasDiff(db: DbFixture, prov: FixtureDTO): boolean {
  if (db.state !== prov.state) return true;
  if ((db.homeScore90 ?? null) !== (prov.homeScore ?? null)) return true;
  if ((db.awayScore90 ?? null) !== (prov.awayScore ?? null)) return true;
  return false;
}

function formatState(state: string) {
  return state.replace("INPLAY_", "").replace(/_/g, " ");
}

type TrackingStatus = "inDb" | "tracked" | "untracked";

type MergedFixture = {
  externalId: string;
  name: string;
  dbFixture: DbFixture | null;
  provFixture: FixtureDTO | null;
  isDiff: boolean;
  trackingStatus: TrackingStatus;
};

function mergeFixtures(
  dbFixtures: DbFixture[],
  providerFixtures: FixtureDTO[],
  trackedLeagueExternalIds: string[]
): MergedFixture[] {
  const trackedSet = new Set(trackedLeagueExternalIds);
  const seen = new Set<string>();
  const result: MergedFixture[] = [];

  for (const p of providerFixtures) {
    const eid = String(p.externalId);
    seen.add(eid);
    const db = dbFixtures.find((d) => d.externalId === eid) ?? null;
    const trackingStatus: TrackingStatus = db
      ? "inDb"
      : p.leagueExternalId && trackedSet.has(String(p.leagueExternalId))
        ? "tracked"
        : "untracked";
    result.push({
      externalId: eid,
      name: p.name,
      dbFixture: db,
      provFixture: p,
      isDiff: db ? hasDiff(db, p) : trackingStatus === "tracked",
      trackingStatus,
    });
  }

  for (const db of dbFixtures) {
    if (!seen.has(db.externalId)) {
      result.push({
        externalId: db.externalId,
        name: db.name,
        dbFixture: db,
        provFixture: null,
        isDiff: true,
        trackingStatus: "inDb",
      });
    }
  }

  return result;
}

function LiveFixturesSection({
  dbFixtures,
  providerFixtures,
  trackedLeagueExternalIds,
  isLoading,
  isFetching,
  onRefresh,
}: {
  dbFixtures: DbFixture[];
  providerFixtures: FixtureDTO[];
  trackedLeagueExternalIds: string[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();

  // ─── Own sync mutation (isolated from other tabs) ───
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      fixturesService.syncById(id, false) as Promise<AdminSyncFixturesResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Fixture synced", { description: `Synced ${variables.name}` });
      setSyncingIds((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
    },
    onError: (error: Error, variables) => {
      toast.error("Sync failed", { description: error.message });
      setSyncingIds((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
    },
  });

  const handleSync = useCallback((externalId: string, name: string) => {
    setSyncingIds((prev) => new Set(prev).add(externalId));
    syncMutation.mutate({ id: externalId, name });
  }, [syncMutation]);

  // ─── Memoize merge to avoid recomputing on every render ───
  const merged = useMemo(
    () => mergeFixtures(dbFixtures, providerFixtures, trackedLeagueExternalIds),
    [dbFixtures, providerFixtures, trackedLeagueExternalIds]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Radio className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          No live fixtures right now
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-7 text-xs"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3 w-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    );
  }

  const diffCount = merged.filter((m) => m.isDiff).length;
  const untrackedCount = merged.filter((m) => m.trackingStatus === "untracked").length;

  function statusInfo(m: MergedFixture): { label: string; className: string } {
    if (m.trackingStatus === "inDb" && !m.isDiff) {
      return { label: "OK", className: "text-green-600 dark:text-green-400 font-medium" };
    }
    if (m.trackingStatus === "inDb" && m.isDiff) {
      return { label: "Out of sync", className: "text-amber-600 dark:text-amber-400 font-medium" };
    }
    if (m.trackingStatus === "tracked") {
      return { label: "Not synced", className: "text-blue-600 dark:text-blue-400 font-medium" };
    }
    return { label: "Untracked", className: "text-muted-foreground" };
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold">
          {merged.length} fixture{merged.length !== 1 ? "s" : ""} in play
        </span>
        {diffCount > 0 && (
          <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
            {diffCount} out of sync
          </Badge>
        )}
        {untrackedCount > 0 && (
          <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground">
            {untrackedCount} untracked
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Header row - desktop */}
      <div className="hidden sm:grid sm:grid-cols-[50px_1fr_140px_140px_80px_100px] gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 px-3">
        <span>Min</span>
        <span>Fixture</span>
        <span>Database</span>
        <span>Provider</span>
        <span>Status</span>
        <span>League</span>
      </div>

      <div className="space-y-1.5">
        {merged.map((m) => {
          const isSyncing = syncingIds.has(m.externalId);
          const db = m.dbFixture;
          const prov = m.provFixture;
          const status = statusInfo(m);
          const isUntracked = m.trackingStatus === "untracked";
          const showSync = m.isDiff && !isUntracked;

          return (
            <div
              key={m.externalId}
              className={cn(
                "rounded-md border px-2.5 py-2 sm:px-3",
                isUntracked
                  ? "opacity-50"
                  : m.isDiff
                    ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10"
                    : ""
              )}
            >
              {/* Mobile: card layout */}
              <div className="sm:hidden space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Link to={db ? `/fixtures/${db.id}` : "#"} className="text-xs font-medium hover:underline truncate">
                    {m.name}
                  </Link>
                  {prov?.liveMinute != null && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-green-300 text-green-700 dark:border-green-800 dark:text-green-400 tabular-nums">
                      {prov.liveMinute}'
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {db?.league?.name ?? prov?.leagueName ?? ""}
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">DB:</span>
                    {db ? (
                      <>
                        <span className="font-bold tabular-nums">{db.homeScore90 ?? "–"}-{db.awayScore90 ?? "–"}</span>
                        <span className="text-muted-foreground">{formatState(db.state)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Prov:</span>
                    {prov ? (
                      <>
                        <span className="font-bold tabular-nums">{prov.homeScore ?? "–"}-{prov.awayScore ?? "–"}</span>
                        <span className="text-muted-foreground">{formatState(prov.state)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="ml-auto">
                    {showSync ? (
                      <Button
                        variant="default"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isSyncing}
                        onClick={() => handleSync(m.externalId, m.name)}
                      >
                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      </Button>
                    ) : isUntracked ? (
                      <span className="text-[10px] text-muted-foreground">Untracked</span>
                    ) : (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">OK</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop: fixture-centric row */}
              <div className="hidden sm:grid sm:grid-cols-[50px_1fr_140px_140px_80px_100px] gap-2 items-center">
                <div className="text-center">
                  {prov?.liveMinute != null && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 dark:border-green-800 dark:text-green-400 tabular-nums">
                      {prov.liveMinute}'
                    </Badge>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    to={db ? `/fixtures/${db.id}` : "#"}
                    className="text-xs font-medium hover:underline truncate block"
                  >
                    {m.name}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  {db ? (
                    <>
                      <span className="font-bold tabular-nums shrink-0">{db.homeScore90 ?? "–"}-{db.awayScore90 ?? "–"}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{formatState(db.state)}</Badge>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs min-w-0">
                  {prov ? (
                    <>
                      <span className="font-bold tabular-nums shrink-0">{prov.homeScore ?? "–"}-{prov.awayScore ?? "–"}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{formatState(prov.state)}</Badge>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-[11px]">Not live</span>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {showSync ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isSyncing}
                      onClick={() => handleSync(m.externalId, m.name)}
                    >
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" />Sync</>}
                    </Button>
                  ) : (
                    <span className={`text-[10px] ${status.className}`}>{status.label}</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {db?.league?.name ?? prov?.leagueName ?? ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Attention Mobile Filter Drawer (isolated open state)
// ═══════════════════════════════════════════════════════════════

function AttentionMobileFilterDrawer({
  filters,
  setFilters,
  issueCounts,
  availableLeagues,
  applyFilters,
  resetFilters,
  hasActiveFilters,
  filtersAreDirty,
  activeFilterCount,
}: {
  filters: AttentionFilters;
  setFilters: React.Dispatch<React.SetStateAction<AttentionFilters>>;
  issueCounts: { stuck: number; unsettled: number; overdue: number; noScores: number; scoreMismatch: number } | undefined;
  availableLeagues: { id: number; name: string }[];
  applyFilters: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  filtersAreDirty: boolean;
  activeFilterCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetFilters}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
      {open && (
        <Drawer open onOpenChange={setOpen} shouldScaleBackground={false}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 space-y-4 pb-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                <Select
                  value={filters.issueType}
                  onValueChange={(v) => setFilters((f) => ({ ...f, issueType: v as FixtureIssueType | "all" }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues{issueCounts ? ` (${Object.values(issueCounts).reduce((a, b) => a + b, 0)})` : ""}</SelectItem>
                    {(issueCounts?.stuck ?? 0) > 0 && <SelectItem value="stuck">Stuck LIVE ({issueCounts!.stuck})</SelectItem>}
                    {(issueCounts?.overdue ?? 0) > 0 && <SelectItem value="overdue">Overdue NS ({issueCounts!.overdue})</SelectItem>}
                    {(issueCounts?.noScores ?? 0) > 0 && <SelectItem value="noScores">No Scores ({issueCounts!.noScores})</SelectItem>}
                    {(issueCounts?.unsettled ?? 0) > 0 && <SelectItem value="unsettled">Unsettled ({issueCounts!.unsettled})</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date range</label>
                <DateRangePickerButton
                  from={filters.fromDate}
                  to={filters.toDate}
                  onChange={(from, to) => setFilters((f) => ({ ...f, fromDate: from, toDate: to }))}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">League</label>
                <LeagueCombobox
                  leagues={availableLeagues}
                  value={filters.leagueId}
                  onChange={(v) => setFilters((f) => ({ ...f, leagueId: v }))}
                  className="h-9 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { applyFilters(); setOpen(false); } }}
                    placeholder="Team, fixture, or ID..."
                    className="h-9 pl-8 pr-8 text-sm"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={() => { applyFilters(); setOpen(false); }} disabled={!filtersAreDirty && !hasActiveFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={() => { resetFilters(); setOpen(false); }}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset All
                </Button>
              )}
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// League Combobox (from available leagues list)
// ═══════════════════════════════════════════════════════════════

function LeagueCombobox({
  leagues,
  value,
  onChange,
  className,
}: {
  leagues: { id: number; name: string }[];
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedName = leagues.find((l) => l.id === value)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate">{selectedName ?? "All Leagues"}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search league..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>No league found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => { onChange(undefined); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-3.5 w-3.5", value === undefined ? "opacity-100" : "opacity-0")} />
                All Leagues
              </CommandItem>
              {leagues.map((league) => (
                <CommandItem
                  key={league.id}
                  value={league.name}
                  onSelect={() => { onChange(league.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === league.id ? "opacity-100" : "opacity-0")} />
                  {league.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════
// DB-backed League Search Combobox
// ═══════════════════════════════════════════════════════════════

function LeagueSearchCombobox({
  value,
  displayName,
  onChange,
  className,
}: {
  value: number | undefined;
  displayName: string;
  onChange: (id: number | undefined, name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["leagues", "search", debouncedSearch],
    queryFn: () => leaguesService.search(debouncedSearch, 20),
    enabled: open && debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const leagues = data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate">{displayName || "All Leagues"}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search league..."
            className="h-8 text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isFetching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isFetching && search.length >= 2 && leagues.length === 0 && (
              <CommandEmpty>No league found.</CommandEmpty>
            )}
            {!isFetching && search.length < 2 && !value && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Type at least 2 characters
              </div>
            )}
            <CommandGroup>
              {value !== undefined && (
                <CommandItem
                  onSelect={() => { onChange(undefined, ""); setSearch(""); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5 opacity-0")} />
                  All Leagues
                </CommandItem>
              )}
              {leagues.map((league) => (
                <CommandItem
                  key={league.id}
                  value={String(league.id)}
                  onSelect={() => { onChange(league.id, league.name); setSearch(""); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === league.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{league.name}</span>
                  {league.country && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{league.country.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════
// Date Range Picker Button
// ═══════════════════════════════════════════════════════════════

function DateRangePickerButton({
  from,
  to,
  onChange,
  className,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onChange: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
}) {
  const hasRange = from && to;
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<{
    from?: Date;
    to?: Date;
  }>({ from, to });

  const pendingComplete = !!pendingRange.from && !!pendingRange.to;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setPendingRange({ from, to });
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start font-normal",
            !hasRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {hasRange
              ? `${format(from, "dd/MM/yyyy")} – ${format(to, "dd/MM/yyyy")}`
              : "Date range"}
          </span>
          {hasRange && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined, undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange(undefined, undefined);
                }
              }}
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="range"
          defaultMonth={from}
          selected={
            pendingRange.from
              ? { from: pendingRange.from, to: pendingRange.to }
              : undefined
          }
          onSelect={(range) => setPendingRange(range ?? {})}
          numberOfMonths={2}
        />
        <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!pendingComplete}
            onClick={() => {
              if (pendingRange.from && pendingRange.to) {
                onChange(pendingRange.from, pendingRange.to);
              }
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════
// Simple Pagination
// ═══════════════════════════════════════════════════════════════

function SimplePagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 pt-3 border-t mt-3 text-xs">
      <span className="text-muted-foreground">
        {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        {onPerPageChange && (
          <Select
            value={perPage.toString()}
            onValueChange={(v) => onPerPageChange(Number(v))}
          >
            <SelectTrigger className="w-[65px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <span className="font-medium">
          {page}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
