import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
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
  Loader2,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import type { AvailableSeason } from "@repo/types";

type StatusFilter = "active" | "upcoming" | "finished" | "all";
type DbStatusFilter = "new" | "in_db" | "all";

export function SeasonsTab() {
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const { data, isLoading } = useAvailability({ includeHistorical });
  const queryClient = useQueryClient();
  const selection = useSeasonSelection();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dbStatusFilter, setDbStatusFilter] = useState<DbStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");

  const [selectedSeason, setSelectedSeason] = useState<AvailableSeason | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [syncingSeasonId, setSyncingSeasonId] = useState<number | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<AvailableSeason | null>(null);
  const [drawerSeason, setDrawerSeason] = useState<AvailableSeason | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const allSeasons = data?.data?.seasons ?? [];

  // Unique country & league lists for filters
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSeasons) set.add(s.league.country);
    return [...set].sort();
  }, [allSeasons]);

  const leagueOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSeasons) {
      if (countryFilter === "all" || s.league.country === countryFilter) {
        set.add(s.league.name);
      }
    }
    return [...set].sort();
  }, [allSeasons, countryFilter]);

  const filteredSeasons = useMemo(() => {
    return allSeasons.filter((s) => {
      // DB status filter
      if (dbStatusFilter !== "all" && s.status !== dbStatusFilter) return false;

      // Activity status filter
      if (statusFilter !== "all") {
        if (statusFilter === "active" && (s.isFinished || s.isPending)) return false;
        if (statusFilter === "upcoming" && !s.isPending) return false;
        if (statusFilter === "finished" && !s.isFinished) return false;
      }

      // Country filter
      if (countryFilter !== "all" && s.league.country !== countryFilter) return false;

      // League filter
      if (leagueFilter !== "all" && s.league.name !== leagueFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !s.league.name.toLowerCase().includes(q) &&
          !s.league.country.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q)
        )
          return false;
      }

      return true;
    });
  }, [allSeasons, dbStatusFilter, statusFilter, countryFilter, leagueFilter, searchQuery]);

  const handleSyncFixtures = useCallback(
    async (season: AvailableSeason) => {
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
    },
    [queryClient]
  );

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  }, [queryClient]);

  // Bulk selection helpers
  const selectableNewIds = filteredSeasons
    .filter((s) => s.status === "new")
    .map((s) => s.externalId);

  const allNewSelected =
    selectableNewIds.length > 0 &&
    selectableNewIds.every((id) => selection.isSelected(id));

  const selectedSeasons = allSeasons.filter(
    (s) => s.status === "new" && selection.isSelected(s.externalId)
  );

  const activeFilterCount = [
    searchQuery,
    statusFilter !== "all",
    dbStatusFilter !== "all",
    countryFilter !== "all",
    leagueFilter !== "all",
    includeHistorical,
  ].filter(Boolean).length;

  const filterControls = (
    <>
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search league, country, season..."
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

      <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setLeagueFilter("all"); }}>
        <SelectTrigger className="h-9 w-full sm:w-[160px]">
          <SelectValue placeholder="All countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {countryOptions.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={leagueFilter} onValueChange={setLeagueFilter}>
        <SelectTrigger className="h-9 w-full sm:w-[160px]">
          <SelectValue placeholder="All leagues" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All leagues</SelectItem>
          {leagueOptions.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <SelectTrigger className="h-9 w-full sm:w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="finished">Finished</SelectItem>
        </SelectContent>
      </Select>

      <Select value={dbStatusFilter} onValueChange={(v) => setDbStatusFilter(v as DbStatusFilter)}>
        <SelectTrigger className="h-9 w-full sm:w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All DB</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="in_db">In DB</SelectItem>
        </SelectContent>
      </Select>

      <label className="flex items-center gap-2 cursor-pointer h-9 px-3 border rounded-md shrink-0">
        <Checkbox
          checked={includeHistorical}
          onCheckedChange={(c) => setIncludeHistorical(c === true)}
        />
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Historical</span>
      </label>
    </>
  );

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredSeasons.length} seasons
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["sync-center"] })}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Mobile: filter button */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-2 space-y-3">
                {filterControls}
              </div>
              <DrawerFooter>
                <Button onClick={() => setFiltersOpen(false)}>Done</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Desktop: inline filters */}
        <div className="hidden sm:flex sm:flex-wrap gap-2">
          {filterControls}
        </div>

        {/* Bulk toolbar */}
        {(dbStatusFilter === "new" || dbStatusFilter === "all") && selectableNewIds.length > 0 && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer min-w-0">
              <Checkbox
                checked={allNewSelected}
                onCheckedChange={(checked) => {
                  if (checked) selection.selectAll(selectableNewIds);
                  else selection.deselectAll(selectableNewIds);
                }}
              />
              <span className="text-sm truncate">
                {allNewSelected
                  ? "Deselect All"
                  : `Select All New (${selectableNewIds.length})`}
              </span>
            </label>

            {selection.selectedCount > 0 && (
              <Button size="sm" className="shrink-0" onClick={() => setBulkDialogOpen(true)}>
                <span className="hidden sm:inline">
                  Seed {selection.selectedCount} Selected
                </span>
                <span className="sm:hidden">Seed ({selection.selectedCount})</span>
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filteredSeasons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No seasons match your filters.
          </p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-1.5 max-h-[480px] overflow-y-auto">
              {filteredSeasons.map((season) => (
                <div
                  key={String(season.externalId)}
                  className="border rounded-lg p-3 flex items-center gap-2 cursor-pointer"
                  onClick={() => setDrawerSeason(season)}
                >
                  {season.status === "new" && (
                    <Checkbox
                      checked={selection.isSelected(season.externalId)}
                      onCheckedChange={() => selection.toggle(season.externalId)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{season.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {season.league.name} · {season.league.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <SeasonActivityDot season={season} />
                    <SeasonDbBadge status={season.status} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block max-h-[480px] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Season</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">DB</TableHead>
                    <TableHead className="text-right">Fixtures</TableHead>
                    <TableHead className="text-right w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeasons.map((season) => (
                    <TableRow key={String(season.externalId)}>
                      <TableCell className="py-2">
                        {season.status === "new" && (
                          <Checkbox
                            checked={selection.isSelected(season.externalId)}
                            onCheckedChange={() => selection.toggle(season.externalId)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-medium">{season.name}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {season.league.name}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {season.league.country}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <SeasonActivityBadge season={season} />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <SeasonDbBadge status={season.status} />
                      </TableCell>
                      <TableCell className="py-2 text-right text-muted-foreground">
                        {season.status === "in_db"
                          ? (season.fixturesCount ?? 0) > 0
                            ? season.fixturesCount
                            : season.hasFixturesAvailable
                              ? "Avail."
                              : "0"
                          : "-"}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {season.status === "new" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-3"
                              onClick={() => setSelectedSeason(season)}
                            >
                              Seed
                            </Button>
                          ) : season.status === "in_db" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-3"
                                onClick={() => handleSyncFixtures(season)}
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
                                onClick={() => setDeletingSeason(season)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <SeedSeasonDialog
        season={selectedSeason}
        onClose={() => {
          setSelectedSeason(null);
          invalidateAll();
        }}
      />

      <BulkSeedDialog
        open={bulkDialogOpen}
        seasons={selectedSeasons}
        allSeasons={allSeasons}
        onClose={() => {
          setBulkDialogOpen(false);
          selection.deselectAll();
          invalidateAll();
        }}
      />

      <DeleteSeasonDialog
        season={deletingSeason}
        onClose={(deleted) => {
          setDeletingSeason(null);
          if (deleted) invalidateAll();
        }}
      />

      <SeasonDetailDrawer
        season={drawerSeason}
        onClose={() => setDrawerSeason(null)}
        onSeed={(s) => {
          setDrawerSeason(null);
          setSelectedSeason(s);
        }}
        onSyncFixtures={(s) => {
          setDrawerSeason(null);
          handleSyncFixtures(s);
        }}
        onDelete={(s) => {
          setDrawerSeason(null);
          setDeletingSeason(s);
        }}
        syncingSeasonId={syncingSeasonId}
      />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SeasonActivityDot({ season }: { season: AvailableSeason }) {
  const color = season.isPending
    ? "bg-blue-500"
    : season.isFinished
      ? "bg-muted-foreground"
      : "bg-green-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function SeasonActivityBadge({ season }: { season: AvailableSeason }) {
  if (season.isPending) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      >
        Upcoming
      </Badge>
    );
  }
  if (season.isFinished) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Finished
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    >
      Active
    </Badge>
  );
}

function SeasonDbBadge({ status }: { status: "new" | "in_db" }) {
  if (status === "new") {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
      >
        New
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
    >
      In DB
    </Badge>
  );
}

// ── Mobile Drawer ──────────────────────────────────────────────────

interface SeasonDetailDrawerProps {
  season: AvailableSeason | null;
  onClose: () => void;
  onSeed: (s: AvailableSeason) => void;
  onSyncFixtures: (s: AvailableSeason) => void;
  onDelete: (s: AvailableSeason) => void;
  syncingSeasonId: number | null;
}

function SeasonDetailDrawer({
  season,
  onClose,
  onSeed,
  onSyncFixtures,
  onDelete,
  syncingSeasonId,
}: SeasonDetailDrawerProps) {
  return (
    <Drawer open={!!season} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{season?.name}</DrawerTitle>
          <DrawerDescription>
            {season?.league.name} &middot; {season?.league.country}
          </DrawerDescription>
        </DrawerHeader>

        {season && (
          <div className="px-4 pb-2">
            <Separator className="mb-3" />
            <DetailRow label="Status">
              <SeasonActivityBadge season={season} />
            </DetailRow>
            <DetailRow label="DB">
              <SeasonDbBadge status={season.status} />
            </DetailRow>
            {season.status === "in_db" && (
              <DetailRow label="Fixtures">
                {(season.fixturesCount ?? 0) > 0
                  ? String(season.fixturesCount)
                  : season.hasFixturesAvailable
                    ? "Available"
                    : "0"}
              </DetailRow>
            )}
            {season.lastSyncedAt && (
              <DetailRow label="Last synced">
                {new Date(season.lastSyncedAt).toLocaleDateString()}
              </DetailRow>
            )}
          </div>
        )}

        <DrawerFooter className="flex-row gap-2">
          {season?.status === "new" ? (
            <Button className="flex-1" onClick={() => onSeed(season)}>
              Seed
            </Button>
          ) : season?.status === "in_db" ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onSyncFixtures(season)}
                disabled={syncingSeasonId === season.dbId}
              >
                {syncingSeasonId === season.dbId && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {(season.fixturesCount ?? 0) > 0 ? "Re-sync" : "Sync"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onDelete(season)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : null}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
