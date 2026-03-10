import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { leaguesService } from "@/services/leagues.service";
import { countriesService } from "@/services/countries.service";
import {
  SyncEntityDialog,
  compareExternalIds,
  type SyncEntityAction,
} from "./sync-entity-dialog";
import { DeleteLeagueDialog, type DeleteLeagueInfo } from "./delete-league-dialog";
import { toast } from "sonner";
import { Search, X, Trophy, RefreshCw, Loader2, Download, Trash2 } from "lucide-react";

interface MergedLeague {
  name: string;
  externalId: string;
  dbId: number | null;
  imagePath: string | null;
  countryName: string;
  countryFlag: string | null;
  seasonsCount: number | null;
  fixturesCount: number | null;
  inDb: boolean;
  inProvider: boolean;
}

export function LeaguesTab() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [syncAction, setSyncAction] = useState<SyncEntityAction | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [drawerLeague, setDrawerLeague] = useState<MergedLeague | null>(null);
  const [deletingLeague, setDeletingLeague] = useState<DeleteLeagueInfo | null>(null);
  const queryClient = useQueryClient();

  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ["sync-center", "provider-leagues"],
    queryFn: () => leaguesService.getFromProvider(),
    staleTime: 30 * 60_000,
  });

  const { data: dbData, isLoading: dbLoading } = useQuery({
    queryKey: ["sync-center", "db-leagues-with-counts"],
    queryFn: () => leaguesService.getFromDb({ perPage: 10000, include: "counts" }),
    staleTime: 30 * 60_000,
  });

  // Fetch DB countries to resolve countryExternalId → name for provider leagues
  const { data: dbCountries } = useQuery({
    queryKey: ["sync-center", "db-countries-for-league-lookup"],
    queryFn: () => countriesService.getFromDb({ perPage: 10000 }),
    staleTime: Infinity,
  });

  const isLoading = providerLoading || dbLoading;

  // Build country lookup: externalId → { name, imagePath }
  const countryLookup = useMemo(() => {
    const map = new Map<string, { name: string; imagePath: string | null }>();
    for (const c of dbCountries?.data ?? []) {
      map.set(String(c.externalId), { name: c.name, imagePath: c.imagePath });
    }
    return map;
  }, [dbCountries]);

  const merged = useMemo<MergedLeague[]>(() => {
    const map = new Map<string, MergedLeague>();

    // Provider leagues — resolve country via countryExternalId lookup
    for (const p of providerData?.data ?? []) {
      const key = String(p.externalId);
      const countryExtId = p.countryExternalId ? String(p.countryExternalId) : null;
      const resolvedCountry = countryExtId ? countryLookup.get(countryExtId) : null;
      map.set(key, {
        name: p.name,
        externalId: key,
        dbId: null,
        imagePath: p.imagePath ?? null,
        countryName: resolvedCountry?.name ?? p.country?.name ?? "Unknown",
        countryFlag: resolvedCountry?.imagePath ?? p.country?.imagePath ?? null,
        seasonsCount: null,
        fixturesCount: null,
        inDb: false,
        inProvider: true,
      });
    }

    // DB leagues — merge or add
    for (const d of dbData?.data ?? []) {
      const key = String(d.externalId);
      const existing = map.get(key);
      if (existing) {
        existing.inDb = true;
        existing.dbId = d.id;
        existing.seasonsCount = (d as any).seasonsCount ?? null;
        existing.fixturesCount = (d as any).fixturesCount ?? null;
        if (d.country) {
          existing.countryName = d.country.name;
          existing.countryFlag = d.country.imagePath;
        }
        if (!existing.imagePath && d.imagePath) {
          existing.imagePath = d.imagePath;
        }
      } else {
        map.set(key, {
          name: d.name,
          externalId: key,
          dbId: d.id,
          imagePath: d.imagePath,
          countryName: d.country?.name ?? "Unknown",
          countryFlag: d.country?.imagePath ?? null,
          seasonsCount: (d as any).seasonsCount ?? null,
          fixturesCount: (d as any).fixturesCount ?? null,
          inDb: true,
          inProvider: false,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [providerData, dbData, countryLookup]);

  // Country list for filter
  const countryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const l of merged) names.add(l.countryName);
    return [...names].sort();
  }, [merged]);

  const filtered = useMemo(() => {
    return merged.filter((l) => {
      if (countryFilter !== "all" && l.countryName !== countryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !l.name.toLowerCase().includes(q) &&
          !l.countryName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [merged, search, countryFilter]);

  const handleSyncAll = () => {
    setSyncAction({
      key: `leagues-${Date.now()}`,
      label: "Leagues",
      icon: Trophy,
      fetchPreview: async () => {
        const [provider, db] = await Promise.all([
          leaguesService.getFromProvider(),
          leaguesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      syncFn: () =>
        leaguesService.sync(false) as Promise<{
          data: { ok: number; fail: number; total: number };
        }>,
    });
  };

  const handleSyncOne = async (league: MergedLeague) => {
    if (!league.inProvider) return;
    setSyncingId(league.externalId);
    try {
      await leaguesService.syncById(league.externalId);
      toast.success(`Synced ${league.name}`);
      queryClient.invalidateQueries({ queryKey: ["sync-center"] });
      queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
    } catch {
      toast.error(`Failed to sync ${league.name}`);
    } finally {
      setSyncingId(null);
    }
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
  };

  const handleDelete = (league: MergedLeague) => {
    if (!league.inDb || !league.dbId) return;
    setDeletingLeague({
      externalId: league.externalId,
      dbId: league.dbId,
      name: league.name,
      countryName: league.countryName,
      seasonsCount: league.seasonsCount,
      fixturesCount: league.fixturesCount,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-9 w-full sm:w-[180px]">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handleSyncAll}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sync All</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} leagues</p>

        {/* Mobile: card list */}
        <div className="sm:hidden space-y-2 max-h-[480px] overflow-y-auto">
          {filtered.map((l) => (
            <div
              key={l.externalId}
              className="border rounded-lg p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => setDrawerLeague(l)}
            >
              {l.imagePath ? (
                <img
                  src={l.imagePath}
                  alt=""
                  className="h-6 w-6 object-contain shrink-0"
                />
              ) : (
                <div className="h-6 w-6 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {l.countryName}
                  {l.seasonsCount != null && ` · ${l.seasonsCount} seasons`}
                  {l.fixturesCount != null && ` · ${l.fixturesCount} fix.`}
                </p>
              </div>
              <LeagueSyncBadge inDb={l.inDb} inProvider={l.inProvider} />
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block max-h-[480px] overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Seasons</TableHead>
                <TableHead className="text-right">Fixtures</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.externalId}>
                  <TableCell className="py-2">
                    {l.imagePath ? (
                      <img
                        src={l.imagePath}
                        alt=""
                        className="h-5 w-5 object-contain"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 font-medium">{l.name}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      {l.countryFlag && (
                        <img
                          src={l.countryFlag}
                          alt=""
                          className="h-3.5 w-5 object-contain"
                        />
                      )}
                      <span className="text-muted-foreground">{l.countryName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right text-muted-foreground">
                    {l.seasonsCount ?? "-"}
                  </TableCell>
                  <TableCell className="py-2 text-right text-muted-foreground">
                    {l.fixturesCount ?? "-"}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <LeagueSyncBadge inDb={l.inDb} inProvider={l.inProvider} />
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.inProvider && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          disabled={syncingId === l.externalId}
                          onClick={() => handleSyncOne(l)}
                        >
                          {syncingId === l.externalId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : l.inDb ? (
                            "Re-sync"
                          ) : (
                            <>
                              <Download className="h-3 w-3 mr-1" />
                              Sync
                            </>
                          )}
                        </Button>
                      )}
                      {l.inDb && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(l)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile drawer */}
      <LeagueDetailDrawer
        league={drawerLeague}
        onClose={() => setDrawerLeague(null)}
        onSync={handleSyncOne}
        onDelete={handleDelete}
        syncingId={syncingId}
      />

      <SyncEntityDialog
        action={syncAction}
        onClose={() => setSyncAction(null)}
      />

      <DeleteLeagueDialog
        league={deletingLeague}
        onClose={(deleted) => {
          setDeletingLeague(null);
          if (deleted) invalidateAll();
        }}
      />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function LeagueSyncBadge({
  inDb,
  inProvider,
}: {
  inDb: boolean;
  inProvider: boolean;
}) {
  if (inDb && inProvider) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
      >
        Synced
      </Badge>
    );
  }
  if (inProvider && !inDb) {
    return (
      <Badge
        variant="outline"
        className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
      >
        Available
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      DB Only
    </Badge>
  );
}

interface LeagueDetailDrawerProps {
  league: MergedLeague | null;
  onClose: () => void;
  onSync: (l: MergedLeague) => void;
  onDelete: (l: MergedLeague) => void;
  syncingId: string | null;
}

function LeagueDetailDrawer({
  league,
  onClose,
  onSync,
  onDelete,
  syncingId,
}: LeagueDetailDrawerProps) {
  return (
    <Drawer open={!!league} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            {league?.imagePath && (
              <img src={league.imagePath} alt="" className="h-6 w-6 object-contain" />
            )}
            {league?.name}
          </DrawerTitle>
          <DrawerDescription>{league?.countryName}</DrawerDescription>
        </DrawerHeader>

        {league && (
          <div className="px-4 pb-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <LeagueSyncBadge inDb={league.inDb} inProvider={league.inProvider} />
            </div>
            {league.seasonsCount != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Seasons</span>
                <span className="text-sm font-medium">{league.seasonsCount}</span>
              </div>
            )}
            {league.fixturesCount != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Fixtures</span>
                <span className="text-sm font-medium">{league.fixturesCount}</span>
              </div>
            )}
          </div>
        )}

        <DrawerFooter className="flex-row gap-2">
          {league?.inDb && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { onDelete(league); onClose(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {league?.inProvider && (
            <Button
              className="flex-1"
              onClick={() => { onSync(league); onClose(); }}
              disabled={syncingId === league.externalId}
            >
              {syncingId === league.externalId && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {league.inDb ? "Re-sync" : "Sync"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
