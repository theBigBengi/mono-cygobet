import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useFixturesAttention,
  useFixtureSearch,
} from "@/hooks/use-fixtures";
import { fixturesService } from "@/services/fixtures.service";
import type {
  AdminSyncFixturesResponse,
  FixtureIssueType,
} from "@repo/types";

type FixturesTab = "attention" | "search";

export default function FixturesPage() {
  const [tab, setTab] = useState<FixturesTab>("attention");
  const queryClient = useQueryClient();

  // ─── Attention tab state ───
  const [issueFilter, setIssueFilter] = useState<FixtureIssueType | "all">(
    "all"
  );
  const [attentionPage, setAttentionPage] = useState(1);
  const [attentionPerPage, setAttentionPerPage] = useState(25);

  const {
    data: attentionData,
    isLoading: attentionLoading,
    isFetching: attentionFetching,
  } = useFixturesAttention(
    { issueType: issueFilter, page: attentionPage, perPage: attentionPerPage },
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
    (externalId: string) => {
      const fixture = attentionData?.data.find(
        (f) => f.externalId === externalId
      );
      setSyncingIds((prev) => new Set(prev).add(externalId));
      syncMutation.mutate({
        id: externalId,
        name: fixture?.name ?? externalId,
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

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-6">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as FixturesTab)}
          >
            <TabsList>
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
                Search & Fix
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Attention tab filters */}
        {tab === "attention" && (
          <div className="flex items-center gap-2 mt-3">
            <Select
              value={issueFilter}
              onValueChange={(v) => {
                setIssueFilter(v as FixtureIssueType | "all");
                setAttentionPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
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
            {attentionFetching && !attentionLoading && (
              <span className="text-xs text-muted-foreground">
                Refreshing...
              </span>
            )}
          </div>
        )}

        {/* Search tab bar */}
        {tab === "search" && (
          <div className="mt-3 max-w-md">
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
