import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { countriesService } from "@/services/countries.service";
import { leaguesService } from "@/services/leagues.service";
import { bookmakersService } from "@/services/bookmakers.service";
import { useSyncOverview } from "@/hooks/use-sync-overview";
import {
  SyncEntityDialog,
  compareExternalIds,
  type SyncEntityAction,
} from "./sync-entity-dialog";
import { Globe, Trophy, Bookmark, Database, Clock } from "lucide-react";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIONS: Array<{
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  entityName: string;
}> = [
  {
    key: "countries",
    label: "Countries",
    description: "Fetch all countries from provider and upsert into DB.",
    icon: Globe,
    entityName: "countries",
  },
  {
    key: "leagues",
    label: "Leagues",
    description: "Fetch all leagues from provider and upsert into DB.",
    icon: Trophy,
    entityName: "leagues",
  },
  {
    key: "bookmakers",
    label: "Bookmakers",
    description: "Fetch all bookmakers from provider and upsert into DB.",
    icon: Bookmark,
    entityName: "bookmakers",
  },
];

export function ReferenceDataTab() {
  const [activeAction, setActiveAction] = useState<SyncEntityAction | null>(null);
  const { data: overview, isLoading: overviewLoading } = useSyncOverview();

  // DB counts for badge display
  const { data: countriesDb } = useQuery({
    queryKey: ["quick-actions", "countries-count"],
    queryFn: () => countriesService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });
  const { data: leaguesDb } = useQuery({
    queryKey: ["quick-actions", "leagues-count"],
    queryFn: () => leaguesService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });
  const { data: bookmakersDb } = useQuery({
    queryKey: ["quick-actions", "bookmakers-count"],
    queryFn: () => bookmakersService.getFromDb({ perPage: 1 }),
    staleTime: Infinity,
  });

  const dbCounts: Record<string, number | undefined> = {
    countries: countriesDb?.pagination?.totalItems,
    leagues: leaguesDb?.pagination?.totalItems,
    bookmakers: bookmakersDb?.pagination?.totalItems,
  };

  const overviewEntities = overview?.data?.entities ?? [];

  function getLastSync(entityName: string): string | null {
    const entity = overviewEntities.find((e) => e.name === entityName);
    return entity?.lastSyncedAt ?? null;
  }

  function buildSyncAction(key: string): SyncEntityAction {
    const config = ACTIONS.find((a) => a.key === key)!;
    const fetchPreviewMap: Record<string, () => Promise<any>> = {
      countries: async () => {
        const [provider, db] = await Promise.all([
          countriesService.getFromProvider(),
          countriesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      leagues: async () => {
        const [provider, db] = await Promise.all([
          leaguesService.getFromProvider(),
          leaguesService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
      bookmakers: async () => {
        const [provider, db] = await Promise.all([
          bookmakersService.getFromProvider(),
          bookmakersService.getFromDb({ perPage: 10000 }),
        ]);
        return compareExternalIds(provider.data, db.data);
      },
    };

    const syncFnMap: Record<string, () => Promise<any>> = {
      countries: () => countriesService.sync(false),
      leagues: () => leaguesService.sync(false),
      bookmakers: () => bookmakersService.sync(false),
    };

    return {
      key: config.key,
      label: config.label,
      icon: config.icon,
      fetchPreview: fetchPreviewMap[key],
      syncFn: syncFnMap[key],
    };
  }

  if (overviewLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const count = dbCounts[action.key];
          const lastSync = getLastSync(action.entityName);
          return (
            <Card key={action.key}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </div>
                  {count != null && (
                    <Badge variant="secondary" className="text-xs">
                      <Database className="h-3 w-3 mr-1" />
                      {count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last sync: {formatRelativeTime(lastSync)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs mt-auto"
                  onClick={() => setActiveAction(buildSyncAction(action.key))}
                >
                  Sync
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SyncEntityDialog
        action={activeAction}
        onClose={() => setActiveAction(null)}
      />
    </>
  );
}
