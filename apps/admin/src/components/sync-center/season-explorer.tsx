import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAvailability } from "@/hooks/use-availability";
import { useSeasonSelection } from "@/hooks/use-season-selection";
import { SeedSeasonDialog } from "./seed-season-dialog";
import { BulkSeedDialog } from "./bulk-seed-dialog";
import { DeleteSeasonDialog } from "./delete-season-dialog";
import { fixturesService } from "@/services/fixtures.service";
import { toast } from "sonner";
import {
  Search,
  X,
  History,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  ChevronsUpDown,
  Trash2,
} from "lucide-react";
import type { AvailableSeason } from "@repo/types";

type TabValue = "new" | "in_db" | "all";
type StatusFilterValue = "active" | "upcoming" | "finished" | "all";

interface CountryGroup {
  country: string;
  leagues: LeagueGroup[];
  newCount: number;
  seasonIds: number[];
}

interface LeagueGroup {
  leagueName: string;
  leagueExternalId: number;
  seasons: AvailableSeason[];
  newCount: number;
}

function groupSeasons(seasons: AvailableSeason[]): CountryGroup[] {
  const countryMap = new Map<string, Map<string, AvailableSeason[]>>();

  for (const s of seasons) {
    if (!countryMap.has(s.league.country)) {
      countryMap.set(s.league.country, new Map());
    }
    const leagueMap = countryMap.get(s.league.country)!;
    if (!leagueMap.has(s.league.name)) {
      leagueMap.set(s.league.name, []);
    }
    leagueMap.get(s.league.name)!.push(s);
  }

  const countries: CountryGroup[] = [];

  for (const [country, leagueMap] of countryMap) {
    const leagues: LeagueGroup[] = [];
    for (const [leagueName, leagueSeasons] of leagueMap) {
      leagues.push({
        leagueName,
        leagueExternalId: leagueSeasons[0].league.externalId,
        seasons: leagueSeasons,
        newCount: leagueSeasons.filter((s) => s.status === "new").length,
      });
    }
    leagues.sort((a, b) => a.leagueName.localeCompare(b.leagueName));

    const allSeasonIds = leagues.flatMap((l) =>
      l.seasons.map((s) => s.externalId)
    );
    const newCount = leagues.reduce((acc, l) => acc + l.newCount, 0);

    countries.push({
      country,
      leagues,
      newCount,
      seasonIds: allSeasonIds,
    });
  }

  // Sort by most "new" first, then alphabetically
  countries.sort(
    (a, b) => b.newCount - a.newCount || a.country.localeCompare(b.country)
  );

  return countries;
}

export function SeasonExplorer() {
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const { data, isLoading } = useAvailability({ includeHistorical });
  const queryClient = useQueryClient();
  const selection = useSeasonSelection();

  const [tab, setTab] = useState<TabValue>("new");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    new Set()
  );
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(
    new Set()
  );
  const [selectedSeason, setSelectedSeason] = useState<AvailableSeason | null>(
    null
  );
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [syncingSeasonId, setSyncingSeasonId] = useState<number | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<AvailableSeason | null>(
    null
  );

  const allSeasons = data?.data?.seasons ?? [];

  const filteredSeasons = useMemo(() => {
    return allSeasons.filter((s) => {
      if (tab === "new" && s.status !== "new") return false;
      if (tab === "in_db" && s.status !== "in_db") return false;

      if (statusFilter !== "all") {
        if (statusFilter === "active" && (s.isFinished || s.isPending))
          return false;
        if (statusFilter === "upcoming" && !s.isPending) return false;
        if (statusFilter === "finished" && !s.isFinished) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          s.league.name.toLowerCase().includes(q) ||
          s.league.country.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allSeasons, tab, statusFilter, searchQuery]);

  const grouped = useMemo(
    () => groupSeasons(filteredSeasons),
    [filteredSeasons]
  );

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const toggleLeague = (key: string) => {
    setExpandedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allExpanded =
    grouped.length > 0 &&
    grouped.every((g) => expandedCountries.has(g.country));

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedCountries(new Set());
      setExpandedLeagues(new Set());
    } else {
      setExpandedCountries(new Set(grouped.map((g) => g.country)));
    }
  }, [allExpanded, grouped]);

  const handleSyncFixtures = async (season: AvailableSeason) => {
    if (season.dbId == null) return;
    setSyncingSeasonId(season.dbId);
    try {
      await fixturesService.syncFiltered({
        seasonId: season.dbId,
        fetchAllFixtureStates: true,
      });
      toast.success(`Fixtures synced for ${season.name}`);
      queryClient.invalidateQueries({ queryKey: ["sync-center"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncingSeasonId(null);
    }
  };

  const allFilteredIds = filteredSeasons
    .filter((s) => s.status === "new")
    .map((s) => s.externalId);

  const allNewSelected =
    allFilteredIds.length > 0 &&
    allFilteredIds.every((id) => selection.isSelected(id));

  const newTabCount = allSeasons.filter((s) => s.status === "new").length;
  const inDbTabCount = allSeasons.filter((s) => s.status === "in_db").length;

  const selectedSeasons = allSeasons.filter(
    (s) => s.status === "new" && selection.isSelected(s.externalId)
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Season Explorer</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["sync-center"] });
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="new" className="flex-1 sm:flex-none">
                New ({newTabCount})
              </TabsTrigger>
              <TabsTrigger value="in_db" className="flex-1 sm:flex-none">
                In DB ({inDbTabCount})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search league, country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9"
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
              onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 cursor-pointer h-9 px-1">
              <Checkbox
                checked={includeHistorical}
                onCheckedChange={(c) => setIncludeHistorical(c === true)}
              />
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Historical</span>
            </label>
          </div>

          {/* Bulk toolbar */}
          {tab === "new" && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer min-w-0">
                <Checkbox
                  checked={allNewSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selection.selectAll(allFilteredIds);
                    } else {
                      selection.deselectAll(allFilteredIds);
                    }
                  }}
                />
                <span className="text-sm truncate">
                  {allNewSelected
                    ? "Deselect All"
                    : `Select All (${allFilteredIds.length})`}
                </span>
              </label>

              {selection.selectedCount > 0 && (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => setBulkDialogOpen(true)}
                >
                  <span className="hidden sm:inline">
                    Seed {selection.selectedCount} Selected
                  </span>
                  <span className="sm:hidden">
                    Seed ({selection.selectedCount})
                  </span>
                </Button>
              )}
            </div>
          )}

          {/* Tree with scroll container */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredSeasons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No seasons match your filters.
            </p>
          ) : (
            <>
              {/* Expand/collapse toggle + count */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {filteredSeasons.length} seasons in {grouped.length}{" "}
                  {grouped.length === 1 ? "country" : "countries"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={toggleExpandAll}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  {allExpanded ? "Collapse All" : "Expand All"}
                </Button>
              </div>

              {/* Scrollable tree */}
              <div className="max-h-[480px] overflow-y-auto -mx-1 px-1 space-y-1">
                {grouped.map((cg) => (
                  <CountryGroupRow
                    key={cg.country}
                    group={cg}
                    expanded={expandedCountries.has(cg.country)}
                    expandedLeagues={expandedLeagues}
                    onToggleCountry={toggleCountry}
                    onToggleLeague={toggleLeague}
                    selection={selection}
                    showCheckboxes={tab === "new"}
                    activeTab={tab}
                    onSeed={setSelectedSeason}
                    onSyncFixtures={handleSyncFixtures}
                    onDelete={setDeletingSeason}
                    syncingSeasonId={syncingSeasonId}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SeedSeasonDialog
        season={selectedSeason}
        onClose={() => {
          setSelectedSeason(null);
          queryClient.invalidateQueries({ queryKey: ["sync-center"] });
          queryClient.invalidateQueries({ queryKey: ["batches"] });
        }}
      />

      <BulkSeedDialog
        open={bulkDialogOpen}
        seasons={selectedSeasons}
        allSeasons={allSeasons}
        onClose={() => {
          setBulkDialogOpen(false);
          selection.deselectAll();
          queryClient.invalidateQueries({ queryKey: ["sync-center"] });
          queryClient.invalidateQueries({ queryKey: ["batches"] });
        }}
      />

      <DeleteSeasonDialog
        season={deletingSeason}
        onClose={(deleted) => {
          setDeletingSeason(null);
          if (deleted) {
            queryClient.invalidateQueries({ queryKey: ["sync-center"] });
            queryClient.invalidateQueries({ queryKey: ["batches"] });
          }
        }}
      />
    </>
  );
}

// ---------- Sub-components ----------

interface CountryGroupRowProps {
  group: CountryGroup;
  expanded: boolean;
  expandedLeagues: Set<string>;
  onToggleCountry: (country: string) => void;
  onToggleLeague: (key: string) => void;
  selection: ReturnType<typeof useSeasonSelection>;
  showCheckboxes: boolean;
  activeTab: TabValue;
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  onDelete: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function CountryGroupRow({
  group,
  expanded,
  expandedLeagues,
  onToggleCountry,
  onToggleLeague,
  selection,
  showCheckboxes,
  activeTab,
  onSeed,
  onSyncFixtures,
  onDelete,
  syncingSeasonId,
}: CountryGroupRowProps) {
  const newIds = group.leagues
    .flatMap((l) => l.seasons)
    .filter((s) => s.status === "new")
    .map((s) => s.externalId);

  const allSelected =
    newIds.length > 0 && newIds.every((id) => selection.isSelected(id));

  return (
    <div className="border rounded-lg">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left cursor-pointer select-none"
        onClick={() => onToggleCountry(group.country)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCountry(group.country);
          }
        }}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {showCheckboxes && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) selection.selectAll(newIds);
                else selection.deselectAll(newIds);
              }}
            />
          </div>
        )}
        <span className="font-medium text-sm truncate">{group.country}</span>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {group.newCount > 0 && (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
            >
              {group.newCount} new
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {group.leagues.length} league
            {group.leagues.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="pl-2 sm:pl-4 pb-1">
          {group.leagues.map((lg) => {
            const leagueKey = `${group.country}:${lg.leagueName}`;
            const leagueExpanded =
              expandedLeagues.has(leagueKey) || group.leagues.length <= 3;

            return (
              <LeagueGroupRow
                key={leagueKey}
                league={lg}
                expanded={leagueExpanded}
                onToggle={() => onToggleLeague(leagueKey)}
                selection={selection}
                showCheckboxes={showCheckboxes}
                activeTab={activeTab}
                onSeed={onSeed}
                onSyncFixtures={onSyncFixtures}
                onDelete={onDelete}
                syncingSeasonId={syncingSeasonId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LeagueGroupRowProps {
  league: LeagueGroup;
  expanded: boolean;
  onToggle: () => void;
  selection: ReturnType<typeof useSeasonSelection>;
  showCheckboxes: boolean;
  activeTab: TabValue;
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  onDelete: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function LeagueGroupRow({
  league,
  expanded,
  onToggle,
  selection,
  showCheckboxes,
  activeTab,
  onSeed,
  onSyncFixtures,
  onDelete,
  syncingSeasonId,
}: LeagueGroupRowProps) {
  const newIds = league.seasons
    .filter((s) => s.status === "new")
    .map((s) => s.externalId);

  const allSelected =
    newIds.length > 0 && newIds.every((id) => selection.isSelected(id));

  return (
    <div className="ml-1 sm:ml-2">
      <div
        role="button"
        tabIndex={0}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 transition-colors rounded text-left cursor-pointer select-none"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        {showCheckboxes && (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) selection.selectAll(newIds);
                else selection.deselectAll(newIds);
              }}
            />
          </div>
        )}
        <span className="text-sm truncate">{league.leagueName}</span>
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          ({league.seasons.length})
        </span>
      </div>

      {expanded && (
        <div className="ml-4 sm:ml-6 space-y-0.5 pb-1">
          {league.seasons.map((season) => (
            <SeasonRow
              key={season.externalId}
              season={season}
              selection={selection}
              showCheckbox={showCheckboxes && season.status === "new"}
              activeTab={activeTab}
              onSeed={onSeed}
              onSyncFixtures={onSyncFixtures}
              onDelete={onDelete}
              syncingSeasonId={syncingSeasonId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SeasonRowProps {
  season: AvailableSeason;
  selection: ReturnType<typeof useSeasonSelection>;
  showCheckbox: boolean;
  activeTab: TabValue;
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  onDelete: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function SeasonRow({
  season,
  selection,
  showCheckbox,
  activeTab,
  onSeed,
  onSyncFixtures,
  onDelete,
  syncingSeasonId,
}: SeasonRowProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2 py-1.5 hover:bg-muted/30 rounded text-sm">
      {showCheckbox && (
        <Checkbox
          checked={selection.isSelected(season.externalId)}
          onCheckedChange={() => selection.toggle(season.externalId)}
          className="shrink-0"
        />
      )}

      {/* Season name */}
      <span className="min-w-0 truncate">{season.name}</span>

      {/* Activity badge - hidden on mobile to save space */}
      <span className="hidden sm:inline-flex">
        {season.isPending ? (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Upcoming
          </Badge>
        ) : season.isFinished ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Finished
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            Active
          </Badge>
        )}
      </span>

      {/* DB status - hide redundant badge when already filtered by tab */}
      {season.status === "new" && activeTab !== "new" && (
        <Badge
          variant="outline"
          className="text-xs shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
        >
          New
        </Badge>
      )}
      {season.status === "in_db" && activeTab !== "in_db" && (
        <Badge
          variant="outline"
          className="text-xs shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
        >
          In DB
        </Badge>
      )}

      {/* Fixtures count - compact on mobile */}
      {season.status === "in_db" && (
        <span className="text-xs text-muted-foreground ml-auto mr-1 sm:mr-2 truncate hidden xs:inline">
          {(season.fixturesCount ?? 0) > 0
            ? `${season.fixturesCount} fix.`
            : season.hasFixturesAvailable
              ? "Avail."
              : ""}
        </span>
      )}

      {/* Action buttons */}
      <div className="ml-auto shrink-0 flex items-center gap-1">
        {season.status === "new" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 sm:px-3"
            onClick={() => onSeed(season)}
          >
            Seed
          </Button>
        ) : season.status === "in_db" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 sm:px-3"
              onClick={() => onSyncFixtures(season)}
              disabled={syncingSeasonId === season.dbId}
            >
              {syncingSeasonId === season.dbId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (season.fixturesCount ?? 0) > 0 ? (
                "Re-sync"
              ) : (
                "Sync"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(season)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
