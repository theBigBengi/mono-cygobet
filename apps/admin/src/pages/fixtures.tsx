import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Radio, RefreshCw, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttentionFixturesTable } from "@/components/fixtures/AttentionFixturesTable";
import { FixtureSearchBar } from "@/components/fixtures/FixtureSearchBar";
import {
  useLiveFixtures,
  useFixturesAttention,
  useFixtureSearch,
} from "@/hooks/use-fixtures";
import { HeaderActions } from "@/contexts/header-actions";
import { fixturesService } from "@/services/fixtures.service";
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

  // ─── Attention tab state ───
  const [issueFilter, setIssueFilter] = useState<FixtureIssueType | "all">(
    "all"
  );
  const [attentionPage, setAttentionPage] = useState(1);
  const [attentionPerPage, setAttentionPerPage] = useState(25);
  const [attentionTimeframe, setAttentionTimeframe] = useState<string>("all");
  const [attentionSearch, setAttentionSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(attentionSearch);
      setAttentionPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [attentionSearch]);

  const {
    data: attentionData,
    isLoading: attentionLoading,
    isFetching: attentionFetching,
  } = useFixturesAttention(
    {
      issueType: issueFilter,
      search: debouncedSearch || undefined,
      timeframe: attentionTimeframe !== "all" ? attentionTimeframe : undefined,
      page: attentionPage,
      perPage: attentionPerPage,
    },
    { enabled: tab === "attention" }
  );

  // ─── Search tab state ───
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useFixtureSearch(searchQuery, { page: searchPage, perPage: 25 }, {
    enabled: tab === "search",
  });

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
          <div className="mt-3 grid grid-cols-2 sm:flex sm:items-center gap-2">
              <Select
                value={issueFilter}
                onValueChange={(v) => {
                  setIssueFilter(v as FixtureIssueType | "all");
                  setAttentionPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs sm:w-[160px]">
                  <SelectValue placeholder="Issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Issues ({totalAttention})</SelectItem>
                  <SelectItem value="stuck">Stuck LIVE ({issueCounts?.stuck ?? 0})</SelectItem>
                  <SelectItem value="overdue">Overdue NS ({issueCounts?.overdue ?? 0})</SelectItem>
                  <SelectItem value="noScores">No Scores ({issueCounts?.noScores ?? 0})</SelectItem>
                  <SelectItem value="unsettled">Unsettled ({issueCounts?.unsettled ?? 0})</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={attentionTimeframe}
                onValueChange={(v) => {
                  setAttentionTimeframe(v);
                  setAttentionPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs sm:w-[120px]">
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
              <div className="relative col-span-2 sm:col-span-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={attentionSearch}
                  onChange={(e) => setAttentionSearch(e.target.value)}
                  placeholder="Team, fixture, or ID..."
                  className="h-8 sm:w-[240px] pl-7 pr-7 text-xs"
                />
                {attentionSearch && (
                  <button
                    type="button"
                    onClick={() => setAttentionSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
          </div>
        )}

        {/* Search tab bar */}
        {tab === "search" && (
          <div className="mt-3 sm:max-w-md">
            <FixtureSearchBar
              value={searchQuery}
              onChange={(v) => {
                setSearchQuery(v);
                setSearchPage(1);
              }}
              placeholder="Search by fixture name (min 2 characters)..."
            />
          </div>
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
            {!attentionLoading && totalAttention > 0 && issueCounts && (
              <div className="flex-shrink-0 mb-3 rounded-lg border bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold">
                    {totalAttention} fixture{totalAttention !== 1 ? "s" : ""} need attention
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {issueCounts.stuck > 0 && (
                      <Badge className="text-[10px] sm:text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
                        {issueCounts.stuck} Stuck
                      </Badge>
                    )}
                    {issueCounts.unsettled > 0 && (
                      <Badge className="text-[10px] sm:text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900">
                        {issueCounts.unsettled} Unsettled
                      </Badge>
                    )}
                    {issueCounts.overdue > 0 && (
                      <Badge className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900">
                        {issueCounts.overdue} Overdue
                      </Badge>
                    )}
                    {issueCounts.noScores > 0 && (
                      <Badge className="text-[10px] sm:text-xs bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900">
                        {issueCounts.noScores} No Scores
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            {!attentionLoading && totalAttention === 0 && (
              <div className="flex-shrink-0 mb-3 rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20 px-4 py-3">
                <p className="text-sm text-green-700 dark:text-green-400">
                  No fixtures need attention — all clear.
                </p>
              </div>
            )}
            <AttentionFixturesTable
              data={attentionData?.data ?? []}
              isLoading={attentionLoading}
              onSync={handleSync}
              onResettle={handleResettle}
              syncingIds={syncingIds}
              resettlingIds={resettlingIds}
            />
          </>
        )}

        {tab === "search" && (
          <>
            {searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Type at least 2 characters to search fixtures
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
                  No fixtures found for "{searchQuery}"
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
                {searchData.pagination.totalPages > 1 && (
                  <SimplePagination
                    page={searchData.pagination.page}
                    totalPages={searchData.pagination.totalPages}
                    totalItems={searchData.pagination.totalItems}
                    perPage={25}
                    onPageChange={setSearchPage}
                  />
                )}
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
