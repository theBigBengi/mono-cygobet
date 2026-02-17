import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAvailability } from "@/hooks/use-availability";
import { useProvider } from "@/contexts/provider-context";
import { SeedSeasonDialog } from "./seed-season-dialog";
import { SectionTooltip } from "./section-tooltip";
import { fixturesService } from "@/services/fixtures.service";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, RefreshCw, AlertCircle, Loader2, Search, X, History, ChevronLeft, ChevronRight } from "lucide-react";
import type { AvailableSeason } from "@repo/types";

function formatSeasonDates(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "-";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

type StatusFilterValue = "active" | "upcoming" | "finished" | "all";

export function SeasonManager() {
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const { data, isLoading, refetch } = useAvailability({ includeHistorical });
  const { name: provider } = useProvider();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("active");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<AvailableSeason | null>(
    null
  );
  const [syncingSeasonId, setSyncingSeasonId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, leagueFilter, includeHistorical]);

  const handleSyncFixtures = async (season: AvailableSeason) => {
    if (season.dbId == null) return;
    setSyncingSeasonId(season.dbId);
    try {
      await fixturesService.syncFiltered({
        seasonId: season.dbId,
        fetchAllFixtureStates: true,
      });
      toast.success(`Fixtures synced for ${season.name}`);
      refetch();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncingSeasonId(null);
    }
  };

  const seasons = data?.data?.seasons ?? [];
  const leagues = [...new Set(seasons.map((s) => s.league.name))].sort();

  const filteredSeasons = seasons.filter((s) => {
    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        s.league.name.toLowerCase().includes(query) ||
        s.league.country.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // League filter
    if (leagueFilter !== "all" && s.league.name !== leagueFilter) return false;

    // Status filter
    switch (statusFilter) {
      case "active":
        return !s.isFinished && !s.isPending;
      case "upcoming":
        return s.isPending;
      case "finished":
        return s.isFinished;
      case "all":
        return true;
      default:
        return true;
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredSeasons.length / pageSize));
  const paginatedSeasons = filteredSeasons.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const rangeStart = filteredSeasons.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredSeasons.length);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Seasons</CardTitle>
                  <SectionTooltip
                    text={`List of all seasons from ${provider} compared to your database.

Status meanings:
- "In DB" = You already synced this season
- "New" = Available from ${provider}, not in your database yet

Activity meanings:
- "Active" = Season is currently running
- "Upcoming" = Season hasn't started yet (future start date)
- "Finished" = Season has ended

Actions:
- "Seed" = Download season + teams + fixtures from ${provider} into your database
- "Sync" = Update fixtures for a season that has new fixtures available

Filter to see only what you need.`}
                    contentClassName="max-w-sm"
                  />
                </div>
                <CardDescription>Manage seasons from provider</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search league, country, season..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 w-[280px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v: StatusFilterValue) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  Active
                  <span className="text-xs text-muted-foreground ml-2">
                    (currently running)
                  </span>
                </SelectItem>
                <SelectItem value="upcoming">
                  Upcoming
                  <span className="text-xs text-muted-foreground ml-2">
                    (not started yet)
                  </span>
                </SelectItem>
                <SelectItem value="finished">
                  Finished
                  <span className="text-xs text-muted-foreground ml-2">
                    (completed seasons)
                  </span>
                </SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league} value={league}>
                    {league}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <Checkbox
                checked={includeHistorical}
                onCheckedChange={(checked) =>
                  setIncludeHistorical(checked === true)
                }
              />
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Include historical
              </span>
            </label>
          </div>

          {(() => {
            const seasonsWithFixtures = filteredSeasons.filter(
              (s) =>
                (s.fixturesCount ?? 0) === 0 && s.hasFixturesAvailable === true
            );
            if (seasonsWithFixtures.length === 0) return null;
            return (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
                <span className="text-sm">
                  <strong>{seasonsWithFixtures.length}</strong> seasons have
                  fixtures available for sync
                </span>
              </div>
            );
          })()}

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>League</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1">
                      Fixtures
                      <SectionTooltip
                        text={`Number of matches in your database for this season.

- Number (e.g., "380") = You have 380 matches synced
- "Fixtures available" = ${provider} has fixtures, you have 0. Click Sync.
- "No fixtures yet" = ${provider} has no fixtures published yet for this season`}
                        contentClassName="max-w-sm"
                      />
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSeasons.map((season) => (
                  <TableRow key={season.externalId}>
                    <TableCell>
                      <div className="text-xs font-mono">
                        {season.dbId != null && (
                          <span className="text-muted-foreground">
                            #{season.dbId}
                          </span>
                        )}
                        {season.dbId != null && (
                          <span className="text-muted-foreground mx-1">/</span>
                        )}
                        <span className="text-muted-foreground">
                          ext:{season.externalId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{season.league.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {season.league.country}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{season.name}</TableCell>
                    <TableCell>
                      {season.status === "new" ? (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                        >
                          New
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        >
                          In DB
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {season.isPending ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Upcoming
                        </Badge>
                      ) : season.isFinished ? (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Finished
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatSeasonDates(season.startDate, season.endDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {season.status === "new" ? (
                        "-"
                      ) : (season.fixturesCount ?? 0) === 0 ? (
                        season.hasFixturesAvailable ? (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Fixtures available
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No fixtures yet
                          </span>
                        )
                      ) : (
                        season.fixturesCount
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {season.status === "new" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedSeason(season)}
                            >
                              Seed
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-sm whitespace-pre-line">
                              {`Downloads a complete season into your database.

This will:
1. Create the season record
2. Fetch all teams playing in this season (~20 teams)
3. Fetch all fixtures/matches (~380 matches for a league)

From: ${provider} API
Time: May take 30-60 seconds

After seeding, use "Sync Fixtures" to keep matches updated.`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (season.fixturesCount ?? 0) === 0 &&
                        season.hasFixturesAvailable ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => handleSyncFixtures(season)}
                              disabled={syncingSeasonId === season.dbId}
                            >
                              {syncingSeasonId === season.dbId ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  Syncing...
                                </>
                              ) : (
                                "Sync"
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p className="text-sm whitespace-pre-line">
                              {`Downloads fixtures for this season.

${provider} has published fixtures for this season, but your database has 0.
Click to download all available matches.

From: ${provider} /schedules/seasons/{id} endpoint`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Synced
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSeasons.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {rangeStart}-{rangeEnd} of {filteredSeasons.length}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      <SeedSeasonDialog
        season={selectedSeason}
        onClose={() => setSelectedSeason(null)}
      />
    </>
  );
}
