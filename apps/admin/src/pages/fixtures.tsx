import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarIcon, Check, ChevronsUpDown, Filter, Loader2, Radio, RefreshCw, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { format, formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function FixturesPage() {
  const [tab, setTab] = useState<FixturesTab>("attention");
  const queryClient = useQueryClient();

  // ─── Live fixtures ───
  const { db: liveDb, provider: liveProvider } = useLiveFixtures();
  const dbFixtures = liveDb.data?.data ?? [];
  const providerFixtures = liveProvider.data?.data ?? [];
  const liveFetching = liveDb.isFetching || liveProvider.isFetching;
  const liveCount = Math.max(dbFixtures.length, providerFixtures.length);
  const refetchLive = () => { void liveDb.refetch(); void liveProvider.refetch(); };

  // ─── Attention tab state (pending / applied filters) ───
  type AttentionFilters = {
    issueType: FixtureIssueType | "all";
    timeframe: string;
    leagueId: number | undefined;
    search: string;
  };
  const defaultFilters: AttentionFilters = {
    issueType: "all",
    timeframe: "all",
    leagueId: undefined,
    search: "",
  };
  const [filters, setFilters] = useState<AttentionFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AttentionFilters>(defaultFilters);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [attentionPage, setAttentionPage] = useState(1);
  const [attentionPerPage, setAttentionPerPage] = useState(25);

  // ─── Selection state (lifted from table for unified toolbar) ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtersAreDirty =
    filters.issueType !== appliedFilters.issueType ||
    filters.timeframe !== appliedFilters.timeframe ||
    filters.leagueId !== appliedFilters.leagueId ||
    filters.search !== appliedFilters.search;

  const hasActiveFilters =
    appliedFilters.issueType !== "all" ||
    appliedFilters.timeframe !== "all" ||
    appliedFilters.leagueId !== undefined ||
    appliedFilters.search !== "";

  const activeFilterCount =
    (appliedFilters.issueType !== "all" ? 1 : 0) +
    (appliedFilters.timeframe !== "all" ? 1 : 0) +
    (appliedFilters.leagueId !== undefined ? 1 : 0) +
    (appliedFilters.search !== "" ? 1 : 0);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setAttentionPage(1);
    setFilterDrawerOpen(false);
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setAttentionPage(1);
  }, []);

  const {
    data: attentionData,
    isLoading: attentionLoading,
    isFetching: attentionFetching,
  } = useFixturesAttention(
    {
      issueType: appliedFilters.issueType,
      search: appliedFilters.search || undefined,
      timeframe: appliedFilters.timeframe !== "all" ? appliedFilters.timeframe : undefined,
      leagueId: appliedFilters.leagueId,
      page: attentionPage,
      perPage: attentionPerPage,
    },
    { enabled: tab === "attention" }
  );

  // ─── Selection derived values ───
  const allExternalIds = attentionData?.allExternalIds;
  const prevAllIdsRef = useRef<string>("");

  useEffect(() => {
    const key = allExternalIds?.join(",") ?? "";
    if (prevAllIdsRef.current !== "" && prevAllIdsRef.current !== key) {
      setSelectedIds(new Set());
    }
    prevAllIdsRef.current = key;
  }, [allExternalIds]);

  const pageItems = attentionData?.data ?? [];
  const pageExternalIds = pageItems.map((f) => f.externalId);
  const allPageSelected = pageItems.length > 0 && pageExternalIds.every((id) => selectedIds.has(id));
  const somePageSelected = !allPageSelected && pageExternalIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageExternalIds) next.delete(id);
      } else {
        for (const id of pageExternalIds) next.add(id);
      }
      return next;
    });
  }, [allPageSelected, pageExternalIds]);

  // ─── Search tab state (pending / applied filters) ───
  type SearchFilters = {
    query: string;
    leagueId: number | undefined;
    leagueName: string;
    fromDate: Date | undefined;
    toDate: Date | undefined;
  };
  const defaultSearchFilters: SearchFilters = {
    query: "",
    leagueId: undefined,
    leagueName: "",
    fromDate: undefined,
    toDate: undefined,
  };
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultSearchFilters);
  const [appliedSearchFilters, setAppliedSearchFilters] = useState<SearchFilters>(defaultSearchFilters);
  const [searchFilterDrawerOpen, setSearchFilterDrawerOpen] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  const searchFiltersAreDirty =
    searchFilters.query !== appliedSearchFilters.query ||
    searchFilters.leagueId !== appliedSearchFilters.leagueId ||
    searchFilters.fromDate?.getTime() !== appliedSearchFilters.fromDate?.getTime() ||
    searchFilters.toDate?.getTime() !== appliedSearchFilters.toDate?.getTime();

  const hasDateRange =
    searchFilters.fromDate !== undefined && searchFilters.toDate !== undefined;
  const hasAppliedDateRange =
    appliedSearchFilters.fromDate !== undefined && appliedSearchFilters.toDate !== undefined;

  const hasActiveSearchFilters =
    appliedSearchFilters.query !== "" ||
    appliedSearchFilters.leagueId !== undefined ||
    hasAppliedDateRange;

  const activeSearchFilterCount =
    (appliedSearchFilters.query !== "" ? 1 : 0) +
    (appliedSearchFilters.leagueId !== undefined ? 1 : 0) +
    (hasAppliedDateRange ? 1 : 0);

  // Pending filters would produce a valid query
  const pendingFiltersAreValid =
    searchFilters.query.length >= 2 ||
    searchFilters.leagueId !== undefined ||
    hasDateRange;

  const applySearchFilters = useCallback(() => {
    setAppliedSearchFilters(searchFilters);
    setSearchPage(1);
    setSearchFilterDrawerOpen(false);
  }, [searchFilters]);

  const resetSearchFilters = useCallback(() => {
    setSearchFilters(defaultSearchFilters);
    setAppliedSearchFilters(defaultSearchFilters);
    setSearchPage(1);
  }, []);

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useFixtureSearch(
    {
      q: appliedSearchFilters.query || undefined,
      leagueId: appliedSearchFilters.leagueId,
      fromTs: appliedSearchFilters.fromDate
        ? Math.floor(startOfDay(appliedSearchFilters.fromDate).getTime() / 1000)
        : undefined,
      toTs: appliedSearchFilters.toDate
        ? Math.floor(endOfDay(appliedSearchFilters.toDate).getTime() / 1000)
        : undefined,
      page: searchPage,
      perPage: 25,
    },
    { enabled: tab === "search" }
  );

  // ─── Sync fixture mutation ───
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string; name: string }) =>
      fixturesService.syncById(id, false) as Promise<AdminSyncFixturesResponse>,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Fixture synced", {
        description: `Synced ${variables.name}`,
      });
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
    },
    onError: (error: Error, variables) => {
      toast.error("Sync failed", { description: error.message });
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.id);
        return next;
      });
    },
  });

  const handleSync = useCallback(
    (externalId: string, fixtureName?: string) => {
      if (!fixtureName) {
        const fixture = attentionData?.data.find(
          (f) => f.externalId === externalId
        );
        fixtureName = fixture?.name ?? externalId;
      }
      setSyncingIds((prev) => new Set(prev).add(externalId));
      syncMutation.mutate({
        id: externalId,
        name: fixtureName,
      });
    },
    [syncMutation, attentionData]
  );

  // ─── Resettle mutation ───
  const [resettlingIds, setResettlingIds] = useState<Set<number>>(new Set());
  const resettleMutation = useMutation({
    mutationFn: (fixtureId: number) => fixturesService.resettle(fixtureId),
    onSuccess: (result, fixtureId) => {
      queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      toast.success("Re-settlement complete", {
        description: `${result.groupsAffected} group(s), ${result.predictionsRecalculated} prediction(s)`,
      });
      setResettlingIds((prev) => {
        const next = new Set(prev);
        next.delete(fixtureId);
        return next;
      });
    },
    onError: (error: Error, fixtureId) => {
      toast.error("Re-settle failed", { description: error.message });
      setResettlingIds((prev) => {
        const next = new Set(prev);
        next.delete(fixtureId);
        return next;
      });
    },
  });

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
          const result = await fixturesService.syncBulk(chunks[i].map(Number));
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

  const handleResettle = useCallback(
    (fixtureId: number) => {
      setResettlingIds((prev) => new Set(prev).add(fixtureId));
      resettleMutation.mutate(fixtureId);
    },
    [resettleMutation]
  );

  const totalAttention = attentionData?.pagination.totalItems ?? 0;
  const issueCounts = attentionData?.issueCounts;

  const isAnyFetching = liveFetching || attentionFetching || searchFetching;
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["fixtures"] });
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      <HeaderActions>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshAll} disabled={isAnyFetching}>
          <RefreshCw className={`h-4 w-4 ${isAnyFetching ? "animate-spin" : ""}`} />
        </Button>
      </HeaderActions>
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as FixturesTab)}
          >
            <TabsList>
              <TabsTrigger value="live" className="gap-1.5">
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
              <TabsTrigger value="attention" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Attention
                {totalAttention > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-5 px-1.5 text-[10px]"
                  >
                    {totalAttention}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Search
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Attention tab filters */}
        {tab === "attention" && (
          <>
            {/* ── Mobile: checkbox + badges (scrollable) + filters button ── */}
            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <Checkbox
                checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                disabled={bulkSyncing || pageItems.length === 0}
                className="shrink-0"
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground shrink-0">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : `Page (${pageItems.length})`}
              </span>
              {issueCounts && (
                <div className="flex items-center gap-1 overflow-x-auto min-w-0 shrink">
                  {issueCounts.stuck > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
                      {issueCounts.stuck} Stuck
                    </Badge>
                  )}
                  {issueCounts.unsettled > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900">
                      {issueCounts.unsettled} Unsettled
                    </Badge>
                  )}
                  {issueCounts.overdue > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900">
                      {issueCounts.overdue} Overdue
                    </Badge>
                  )}
                  {issueCounts.noScores > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900">
                      {issueCounts.noScores} No Scores
                    </Badge>
                  )}
                </div>
              )}
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

            {/* ── Mobile: filter drawer ── */}
            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
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
                        <SelectItem value="all">All Issues ({issueCounts ? Object.values(issueCounts).reduce((a, b) => a + b, 0) : 0})</SelectItem>
                        <SelectItem value="stuck">Stuck LIVE ({issueCounts?.stuck ?? 0})</SelectItem>
                        <SelectItem value="overdue">Overdue NS ({issueCounts?.overdue ?? 0})</SelectItem>
                        <SelectItem value="noScores">No Scores ({issueCounts?.noScores ?? 0})</SelectItem>
                        <SelectItem value="unsettled">Unsettled ({issueCounts?.unsettled ?? 0})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Timeframe</label>
                    <Select
                      value={filters.timeframe}
                      onValueChange={(v) => setFilters((f) => ({ ...f, timeframe: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="1h">Last 1h</SelectItem>
                        <SelectItem value="3h">Last 3h</SelectItem>
                        <SelectItem value="6h">Last 6h</SelectItem>
                        <SelectItem value="12h">Last 12h</SelectItem>
                        <SelectItem value="24h">Last 24h</SelectItem>
                        <SelectItem value="24h+">Over 24h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">League</label>
                    <LeagueCombobox
                      leagues={attentionData?.availableLeagues ?? []}
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
                        onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
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
                  <Button onClick={applyFilters} disabled={!filtersAreDirty && !hasActiveFilters}>
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filters
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

            {/* ── Desktop: single row — checkbox + badges | filters ── */}
            <div className="mt-3 hidden sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
              {/* Left: select-all + issue badges */}
              <Checkbox
                checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                onCheckedChange={toggleSelectAll}
                disabled={bulkSyncing || pageItems.length === 0}
                className="shrink-0"
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground shrink-0">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : `Page (${pageItems.length})`}
              </span>
              {issueCounts && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  {issueCounts.stuck > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
                      {issueCounts.stuck} Stuck
                    </Badge>
                  )}
                  {issueCounts.unsettled > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900">
                      {issueCounts.unsettled} Unsettled
                    </Badge>
                  )}
                  {issueCounts.overdue > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900">
                      {issueCounts.overdue} Overdue
                    </Badge>
                  )}
                  {issueCounts.noScores > 0 && (
                    <Badge className="text-[10px] py-0 shrink-0 bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900">
                      {issueCounts.noScores} No Scores
                    </Badge>
                  )}
                </>
              )}
              {/* Right: filters */}
              <div className="flex items-center gap-2 ml-auto">
                <Select
                  value={filters.issueType}
                  onValueChange={(v) => setFilters((f) => ({ ...f, issueType: v as FixtureIssueType | "all" }))}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
                    <SelectItem value="stuck">Stuck LIVE</SelectItem>
                    <SelectItem value="overdue">Overdue NS</SelectItem>
                    <SelectItem value="noScores">No Scores</SelectItem>
                    <SelectItem value="unsettled">Unsettled</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.timeframe}
                  onValueChange={(v) => setFilters((f) => ({ ...f, timeframe: v }))}
                >
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="1h">Last 1h</SelectItem>
                    <SelectItem value="3h">Last 3h</SelectItem>
                    <SelectItem value="6h">Last 6h</SelectItem>
                    <SelectItem value="12h">Last 12h</SelectItem>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="24h+">Over 24h</SelectItem>
                  </SelectContent>
                </Select>
                <LeagueCombobox
                  leagues={attentionData?.availableLeagues ?? []}
                  value={filters.leagueId}
                  onChange={(v) => setFilters((f) => ({ ...f, leagueId: v }))}
                  className="h-8 w-[150px] text-xs"
                />
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && filtersAreDirty) applyFilters(); }}
                    placeholder="Search..."
                    className="h-8 w-[140px] pl-7 pr-7 text-xs"
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
                <Button
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={applyFilters}
                  disabled={!filtersAreDirty || attentionFetching}
                >
                  <Filter className="mr-1 h-3 w-3" />
                  Apply
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {filtersAreDirty && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 w-full text-right">
                  Filters changed — click Apply
                </span>
              )}
            </div>
          </>
        )}

        {/* Search tab filters */}
        {tab === "search" && (
          <>
            {/* ── Mobile: filter button ── */}
            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setSearchFilterDrawerOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                  {activeSearchFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                      {activeSearchFilterCount}
                    </Badge>
                  )}
                </Button>
                {hasActiveSearchFilters && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetSearchFilters}>
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* ── Mobile: search filter drawer ── */}
            <Drawer open={searchFilterDrawerOpen} onOpenChange={setSearchFilterDrawerOpen}>
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
                        onKeyDown={(e) => { if (e.key === "Enter" && pendingFiltersAreValid) applySearchFilters(); }}
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
                  <Button onClick={applySearchFilters} disabled={!pendingFiltersAreValid}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                  {hasActiveSearchFilters && (
                    <DrawerClose asChild>
                      <Button variant="outline" onClick={resetSearchFilters}>
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
            <div className="mt-3 hidden sm:flex sm:items-center sm:gap-2 sm:flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchFilters.query}
                  onChange={(e) => setSearchFilters((f) => ({ ...f, query: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter" && pendingFiltersAreValid) applySearchFilters(); }}
                  placeholder="Search..."
                  className="h-8 w-[160px] pl-7 pr-7 text-xs"
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
              <LeagueSearchCombobox
                value={searchFilters.leagueId}
                displayName={searchFilters.leagueName}
                onChange={(id, name) => setSearchFilters((f) => ({ ...f, leagueId: id, leagueName: name }))}
                className="h-8 w-[170px] text-xs"
              />
              <DateRangePickerButton
                from={searchFilters.fromDate}
                to={searchFilters.toDate}
                onChange={(from, to) => setSearchFilters((f) => ({ ...f, fromDate: from, toDate: to }))}
                className="h-8 w-[240px] text-xs"
              />
              <Button
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={applySearchFilters}
                disabled={!searchFiltersAreDirty || searchFetching || !pendingFiltersAreValid}
              >
                <Search className="mr-1 h-3 w-3" />
                Search
              </Button>
              {hasActiveSearchFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={resetSearchFilters}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
              {searchFiltersAreDirty && pendingFiltersAreValid && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  Click Search to apply
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "live" && (
          <LiveFixturesSection
            dbFixtures={dbFixtures}
            providerFixtures={providerFixtures}
            isLoading={liveDb.isLoading || liveProvider.isLoading}
            isFetching={liveFetching}
            syncingIds={syncingIds}
            onSync={handleSync}
            onRefresh={refetchLive}
          />
        )}

        {tab === "attention" && (
          <>
            <AttentionFixturesTable
              data={attentionData?.data ?? []}
              isLoading={attentionLoading}
              onSync={handleSync}
              onResettle={handleResettle}
              syncingIds={syncingIds}
              resettlingIds={resettlingIds}
              onBulkSync={handleBulkSync}
              bulkSyncing={bulkSyncing}
              bulkProgress={bulkProgress}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </>
        )}

        {tab === "search" && (
          <>
            {!hasActiveSearchFilters ? (
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
                        <TableHead className="hidden md:table-cell">
                          Score
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Start
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                          Issue
                        </TableHead>
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
                            {fixture.homeScore90 != null &&
                            fixture.awayScore90 != null
                              ? `${fixture.homeScore90} - ${fixture.awayScore90}`
                              : fixture.result ?? "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(fixture.startIso),
                              { addSuffix: true }
                            )}
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
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              asChild
                            >
                              <Link to={`/fixtures/${fixture.id}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Pagination — fixed at bottom, outside scroll area */}
      {tab === "attention" &&
        attentionData &&
        attentionData.pagination.totalPages > 1 && (
          <div className="flex-shrink-0">
            <SimplePagination
              page={attentionData.pagination.page}
              totalPages={attentionData.pagination.totalPages}
              totalItems={attentionData.pagination.totalItems}
              perPage={attentionPerPage}
              onPageChange={setAttentionPage}
              onPerPageChange={(v) => {
                setAttentionPerPage(v);
                setAttentionPage(1);
              }}
            />
          </div>
        )}
      {tab === "search" &&
        searchData &&
        searchData.pagination.totalPages > 1 && (
          <div className="flex-shrink-0">
            <SimplePagination
              page={searchData.pagination.page}
              totalPages={searchData.pagination.totalPages}
              totalItems={searchData.pagination.totalItems}
              perPage={25}
              onPageChange={setSearchPage}
            />
          </div>
        )}
    </div>
  );
}

// ─── Live Fixtures Section ───

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

type MergedFixture = {
  externalId: string;
  name: string;
  dbFixture: DbFixture | null;
  provFixture: FixtureDTO | null;
  isDiff: boolean;
};

function mergeFixtures(dbFixtures: DbFixture[], providerFixtures: FixtureDTO[]): MergedFixture[] {
  const provMap = new Map<string, FixtureDTO>();
  for (const p of providerFixtures) provMap.set(String(p.externalId), p);

  const seen = new Set<string>();
  const result: MergedFixture[] = [];

  // Start with provider fixtures (source of truth for what's live)
  for (const p of providerFixtures) {
    const eid = String(p.externalId);
    seen.add(eid);
    const db = dbFixtures.find((d) => d.externalId === eid) ?? null;
    result.push({
      externalId: eid,
      name: p.name,
      dbFixture: db,
      provFixture: p,
      isDiff: db ? hasDiff(db, p) : true,
    });
  }

  // Add DB fixtures not in provider (maybe finished in provider but still live in DB)
  for (const db of dbFixtures) {
    if (!seen.has(db.externalId)) {
      result.push({
        externalId: db.externalId,
        name: db.name,
        dbFixture: db,
        provFixture: null,
        isDiff: true, // provider doesn't have it as live anymore
      });
    }
  }

  return result;
}

function LiveFixturesSection({
  dbFixtures,
  providerFixtures,
  isLoading,
  isFetching,
  syncingIds,
  onSync,
  onRefresh,
}: {
  dbFixtures: DbFixture[];
  providerFixtures: FixtureDTO[];
  isLoading: boolean;
  isFetching: boolean;
  syncingIds: Set<string>;
  onSync: (externalId: string, name: string) => void;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const merged = mergeFixtures(dbFixtures, providerFixtures);

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
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5 px-3">
        <span>Database</span>
        <span />
        <span>Provider</span>
        <span />
      </div>

      <div className="space-y-1.5">
        {merged.map((m) => {
          const isSyncing = syncingIds.has(m.externalId);
          const db = m.dbFixture;
          const prov = m.provFixture;

          return (
            <div
              key={m.externalId}
              className={`rounded-md border px-2.5 py-2 sm:px-3 ${m.isDiff ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/10" : ""}`}
            >
              {/* Mobile: stacked layout */}
              <div className="sm:hidden space-y-1.5">
                <Link to={db ? `/fixtures/${db.id}` : "#"} className="text-xs font-medium hover:underline truncate block">
                  {m.name}
                </Link>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-[11px]">
                  {/* DB column */}
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-muted-foreground">DB</div>
                    {db ? (
                      <>
                        <div className="font-bold tabular-nums">{db.homeScore90 ?? "–"} - {db.awayScore90 ?? "–"}</div>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{formatState(db.state)}</Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not in DB</span>
                    )}
                  </div>
                  {/* Sync button */}
                  <div>
                    {m.isDiff && (
                      <Button
                        variant={m.isDiff ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7"
                        disabled={isSyncing}
                        onClick={() => onSync(m.externalId, m.name)}
                      >
                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                  {/* Provider column */}
                  <div className="space-y-0.5 text-right">
                    <div className="text-[10px] text-muted-foreground">Provider</div>
                    {prov ? (
                      <>
                        <div className="font-bold tabular-nums">{prov.homeScore ?? "–"} - {prov.awayScore ?? "–"}</div>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{formatState(prov.state)}</Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not live</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop: single row */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                {/* DB side */}
                <div className="flex items-center gap-2 min-w-0">
                  {db ? (
                    <Link to={`/fixtures/${db.id}`} className="flex items-center gap-1.5 min-w-0 hover:opacity-70 transition-opacity">
                      {db.homeTeam?.imagePath && <img src={db.homeTeam.imagePath} alt="" className="h-5 w-5 object-contain shrink-0" />}
                      <span className="text-xs font-medium truncate">{db.homeTeam?.name ?? "Home"}</span>
                      <span className="text-sm font-bold tabular-nums shrink-0">{db.homeScore90 ?? "–"} - {db.awayScore90 ?? "–"}</span>
                      <span className="text-xs font-medium truncate">{db.awayTeam?.name ?? "Away"}</span>
                      {db.awayTeam?.imagePath && <img src={db.awayTeam.imagePath} alt="" className="h-5 w-5 object-contain shrink-0" />}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not in DB</span>
                  )}
                  {db && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{formatState(db.state)}</Badge>
                  )}
                </div>

                {/* Sync button in the middle */}
                <div className="flex items-center justify-center w-16">
                  {m.isDiff ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={isSyncing}
                      onClick={() => onSync(m.externalId, m.name)}
                    >
                      {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3 mr-1" />Sync</>}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">OK</span>
                  )}
                </div>

                {/* Provider side */}
                <div className="flex items-center gap-2 min-w-0">
                  {prov ? (
                    <>
                      <span className="text-xs font-medium truncate">{prov.name}</span>
                      <span className="text-sm font-bold tabular-nums shrink-0">{prov.homeScore ?? "–"} - {prov.awayScore ?? "–"}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{formatState(prov.state)}</Badge>
                      {prov.liveMinute != null && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{prov.liveMinute}'</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not live in provider</span>
                  )}
                </div>

                {/* League */}
                <div className="hidden lg:block text-[11px] text-muted-foreground truncate max-w-[100px]">
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

// ─── League Combobox (searchable) ───
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

// ─── DB-backed League Search Combobox ───
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

// ─── Date Range Picker Button ───
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

// ─── Simple Pagination ───
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
