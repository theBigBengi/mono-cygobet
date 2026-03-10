import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { countriesService } from "@/services/countries.service";
import {
  SyncEntityDialog,
  compareExternalIds,
  type SyncEntityAction,
} from "./sync-entity-dialog";
import { DeleteCountryDialog, type DeleteCountryInfo } from "./delete-country-dialog";
import { toast } from "sonner";
import { Search, X, Globe, RefreshCw, Loader2, Download, Trash2 } from "lucide-react";

interface MergedCountry {
  name: string;
  externalId: string;
  dbId: number | null;
  imagePath: string | null;
  iso2: string | null;
  leaguesInDb: number | null;
  inDb: boolean;
  inProvider: boolean;
}

export function CountriesTab() {
  const [search, setSearch] = useState("");
  const [syncAction, setSyncAction] = useState<SyncEntityAction | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [drawerCountry, setDrawerCountry] = useState<MergedCountry | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<DeleteCountryInfo | null>(null);
  const queryClient = useQueryClient();

  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ["sync-center", "provider-countries"],
    queryFn: () => countriesService.getFromProvider(),
    staleTime: 30 * 60_000,
  });

  const { data: dbData, isLoading: dbLoading } = useQuery({
    queryKey: ["sync-center", "db-countries"],
    queryFn: () => countriesService.getFromDb({ perPage: 10000 }),
    staleTime: 30 * 60_000,
  });

  const isLoading = providerLoading || dbLoading;

  const merged = useMemo<MergedCountry[]>(() => {
    const map = new Map<string, MergedCountry>();

    for (const p of providerData?.data ?? []) {
      const key = String(p.externalId);
      map.set(key, {
        name: p.name,
        externalId: key,
        dbId: null,
        imagePath: p.imagePath ?? null,
        iso2: p.iso2 ?? null,
        leaguesInDb: null,
        inDb: false,
        inProvider: true,
      });
    }

    for (const d of dbData?.data ?? []) {
      const key = String(d.externalId);
      const existing = map.get(key);
      if (existing) {
        existing.inDb = true;
        existing.dbId = d.id;
        existing.leaguesInDb = d.leaguesCount ?? null;
        if (!existing.imagePath && d.imagePath) {
          existing.imagePath = d.imagePath;
        }
      } else {
        map.set(key, {
          name: d.name,
          externalId: key,
          dbId: d.id,
          imagePath: d.imagePath,
          iso2: d.iso2,
          leaguesInDb: d.leaguesCount ?? null,
          inDb: true,
          inProvider: false,
        });
      }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [providerData, dbData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return merged;
    const q = search.toLowerCase();
    return merged.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.iso2 && c.iso2.toLowerCase().includes(q))
    );
  }, [merged, search]);

  const handleSyncAll = () => {
    setSyncAction({
      key: `countries-${Date.now()}`,
      label: "Countries",
      icon: Globe,
      fetchPreview: async () => {
        const [provider, db] = await Promise.all([
          countriesService.getFromProvider(),
          countriesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      syncFn: () =>
        countriesService.sync(false) as Promise<{
          data: { ok: number; fail: number; total: number };
        }>,
    });
  };

  const handleSyncOne = async (country: MergedCountry) => {
    if (!country.inProvider) return;
    setSyncingId(country.externalId);
    try {
      await countriesService.syncById(country.externalId);
      toast.success(`Synced ${country.name}`);
      queryClient.invalidateQueries({ queryKey: ["sync-center"] });
      queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
    } catch {
      toast.error(`Failed to sync ${country.name}`);
    } finally {
      setSyncingId(null);
    }
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["sync-center"] });
    queryClient.invalidateQueries({ queryKey: ["sync-overview"] });
  };

  const handleDelete = (country: MergedCountry) => {
    if (!country.inDb || !country.dbId) return;
    setDeletingCountry({
      externalId: country.externalId,
      dbId: country.dbId,
      name: country.name,
      leaguesCount: country.leaguesInDb,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
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
          <Button variant="outline" size="sm" onClick={handleSyncAll}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sync All</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} countries
        </p>

        {/* Mobile: card list */}
        <div className="sm:hidden space-y-2 max-h-[480px] overflow-y-auto">
          {filtered.map((c) => (
            <div
              key={c.externalId}
              className="border rounded-lg p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => setDrawerCountry(c)}
            >
              {c.imagePath ? (
                <img
                  src={c.imagePath}
                  alt=""
                  className="h-5 w-7 object-contain shrink-0"
                />
              ) : (
                <div className="h-5 w-7 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.leaguesInDb != null && (
                  <p className="text-xs text-muted-foreground">
                    {c.leaguesInDb} leagues
                  </p>
                )}
              </div>
              <SyncStatusBadge inDb={c.inDb} inProvider={c.inProvider} />
            </div>
          ))}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block max-h-[480px] overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Leagues in DB</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.externalId}>
                  <TableCell className="py-2">
                    {c.imagePath ? (
                      <img
                        src={c.imagePath}
                        alt=""
                        className="h-4 w-6 object-contain"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 font-medium">{c.name}</TableCell>
                  <TableCell className="py-2 text-right text-muted-foreground">
                    {c.leaguesInDb ?? "-"}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <SyncStatusBadge inDb={c.inDb} inProvider={c.inProvider} />
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.inProvider && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          disabled={syncingId === c.externalId}
                          onClick={() => handleSyncOne(c)}
                        >
                          {syncingId === c.externalId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : c.inDb ? (
                            "Re-sync"
                          ) : (
                            <>
                              <Download className="h-3 w-3 mr-1" />
                              Sync
                            </>
                          )}
                        </Button>
                      )}
                      {c.inDb && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(c)}
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
      <CountryDetailDrawer
        country={drawerCountry}
        onClose={() => setDrawerCountry(null)}
        onSync={handleSyncOne}
        onDelete={handleDelete}
        syncingId={syncingId}
      />

      <SyncEntityDialog
        action={syncAction}
        onClose={() => setSyncAction(null)}
      />

      <DeleteCountryDialog
        country={deletingCountry}
        onClose={(deleted) => {
          setDeletingCountry(null);
          if (deleted) invalidateAll();
        }}
      />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SyncStatusBadge({
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

interface CountryDetailDrawerProps {
  country: MergedCountry | null;
  onClose: () => void;
  onSync: (c: MergedCountry) => void;
  onDelete: (c: MergedCountry) => void;
  syncingId: string | null;
}

function CountryDetailDrawer({
  country,
  onClose,
  onSync,
  onDelete,
  syncingId,
}: CountryDetailDrawerProps) {
  return (
    <Drawer open={!!country} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            {country?.imagePath && (
              <img src={country.imagePath} alt="" className="h-5 w-7 object-contain" />
            )}
            {country?.name}
          </DrawerTitle>
          <DrawerDescription>
            {country?.iso2 ?? ""}
          </DrawerDescription>
        </DrawerHeader>

        {country && (
          <div className="px-4 pb-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">Status</span>
              <SyncStatusBadge inDb={country.inDb} inProvider={country.inProvider} />
            </div>
            {country.leaguesInDb != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">Leagues in DB</span>
                <span className="text-sm font-medium">{country.leaguesInDb}</span>
              </div>
            )}
          </div>
        )}

        <DrawerFooter className="flex-row gap-2">
          {country?.inDb && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { onDelete(country); onClose(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          {country?.inProvider && (
            <Button
              className="flex-1"
              onClick={() => { onSync(country); onClose(); }}
              disabled={syncingId === country.externalId}
            >
              {syncingId === country.externalId && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {country.inDb ? "Re-sync" : "Sync"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
