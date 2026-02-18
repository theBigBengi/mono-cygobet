import { useState, useMemo } from "react";
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
  countries.sort((a, b) => b.newCount - a.newCount || a.country.localeCompare(b.country));

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

  const allSeasons = data?.data?.seasons ?? [];

  const filteredSeasons = useMemo(() => {
    return allSeasons.filter((s) => {
      // Tab filter
      if (tab === "new" && s.status !== "new") return false;
      if (tab === "in_db" && s.status !== "in_db") return false;

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && (s.isFinished || s.isPending))
          return false;
        if (statusFilter === "upcoming" && !s.isPending) return false;
        if (statusFilter === "finished" && !s.isFinished) return false;
      }

      // Search
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

  const grouped = useMemo(() => groupSeasons(filteredSeasons), [filteredSeasons]);

  // Auto-expand all countries when there are few
  const effectiveExpanded = useMemo(() => {
    if (grouped.length <= 5) {
      return new Set(grouped.map((g) => g.country));
    }
    return expandedCountries;
  }, [grouped, expandedCountries]);

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

  // Seasons selected for bulk dialog
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
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList>
              <TabsTrigger value="new">New ({newTabCount})</TabsTrigger>
              <TabsTrigger value="in_db">In DB ({inDbTabCount})</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search league, country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 w-[240px] h-9"
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
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 cursor-pointer">
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
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <label className="flex items-center gap-2 cursor-pointer">
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
                <span className="text-sm">
                  {allNewSelected
                    ? "Deselect All"
                    : `Select All (${allFilteredIds.length})`}
                </span>
              </label>

              {selection.selectedCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setBulkDialogOpen(true)}
                >
                  Seed {selection.selectedCount} Selected
                </Button>
              )}
            </div>
          )}

          {/* Tree */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filteredSeasons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No seasons match your filters.
            </p>
          ) : (
            <div className="space-y-1">
              {grouped.map((cg) => (
                <CountryGroupRow
                  key={cg.country}
                  group={cg}
                  expanded={effectiveExpanded.has(cg.country)}
                  expandedLeagues={expandedLeagues}
                  onToggleCountry={toggleCountry}
                  onToggleLeague={toggleLeague}
                  selection={selection}
                  showCheckboxes={tab === "new"}
                  onSeed={setSelectedSeason}
                  onSyncFixtures={handleSyncFixtures}
                  syncingSeasonId={syncingSeasonId}
                />
              ))}
            </div>
          )}

          {/* Summary */}
          {!isLoading && filteredSeasons.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2">
              Showing {filteredSeasons.length} seasons in {grouped.length}{" "}
              {grouped.length === 1 ? "country" : "countries"}
            </p>
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
        onClose={() => {
          setBulkDialogOpen(false);
          selection.deselectAll();
          queryClient.invalidateQueries({ queryKey: ["sync-center"] });
          queryClient.invalidateQueries({ queryKey: ["batches"] });
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
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
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
  onSeed,
  onSyncFixtures,
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
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
        onClick={() => onToggleCountry(group.country)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {showCheckboxes && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) selection.selectAll(newIds);
              else selection.deselectAll(newIds);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span className="font-medium text-sm">{group.country}</span>
        {group.newCount > 0 && (
          <Badge
            variant="outline"
            className="ml-auto text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
          >
            {group.newCount} new
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {group.leagues.length} league{group.leagues.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="pl-4 pb-1">
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
                onSeed={onSeed}
                onSyncFixtures={onSyncFixtures}
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
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function LeagueGroupRow({
  league,
  expanded,
  onToggle,
  selection,
  showCheckboxes,
  onSeed,
  onSyncFixtures,
  syncingSeasonId,
}: LeagueGroupRowProps) {
  const newIds = league.seasons
    .filter((s) => s.status === "new")
    .map((s) => s.externalId);

  const allSelected =
    newIds.length > 0 && newIds.every((id) => selection.isSelected(id));

  return (
    <div className="ml-2">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 transition-colors rounded text-left"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        {showCheckboxes && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) selection.selectAll(newIds);
              else selection.deselectAll(newIds);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span className="text-sm">{league.leagueName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          ({league.seasons.length})
        </span>
      </button>

      {expanded && (
        <div className="ml-6 space-y-0.5 pb-1">
          {league.seasons.map((season) => (
            <SeasonRow
              key={season.externalId}
              season={season}
              selection={selection}
              showCheckbox={showCheckboxes && season.status === "new"}
              onSeed={onSeed}
              onSyncFixtures={onSyncFixtures}
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
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function SeasonRow({
  season,
  selection,
  showCheckbox,
  onSeed,
  onSyncFixtures,
  syncingSeasonId,
}: SeasonRowProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded text-sm">
      {showCheckbox && (
        <Checkbox
          checked={selection.isSelected(season.externalId)}
          onCheckedChange={() => selection.toggle(season.externalId)}
        />
      )}

      <span className="min-w-[80px]">{season.name}</span>

      {/* Activity badge */}
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

      {/* DB status */}
      {season.status === "new" ? (
        <Badge
          variant="outline"
          className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
        >
          New
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
        >
          In DB
        </Badge>
      )}

      {/* Fixtures count */}
      {season.status === "in_db" && (
        <span className="text-xs text-muted-foreground ml-auto mr-2">
          {(season.fixturesCount ?? 0) > 0
            ? `${season.fixturesCount} fixtures`
            : season.hasFixturesAvailable
              ? "Fixtures available"
              : "No fixtures"}
        </span>
      )}

      {/* Action */}
      <div className="ml-auto shrink-0">
        {season.status === "new" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSeed(season)}
          >
            Seed
          </Button>
        ) : (season.fixturesCount ?? 0) === 0 && season.hasFixturesAvailable ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSyncFixtures(season)}
            disabled={syncingSeasonId === season.dbId}
          >
            {syncingSeasonId === season.dbId ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Sync"
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
